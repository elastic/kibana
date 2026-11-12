/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EditorError } from '@elastic/esql/types';
import { validateQuery } from '@kbn/esql-language';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { WorkflowValidationRuleId } from '@kbn/workflows';
import {
  applyLiquidMask,
  classifyLiquidPosition,
  isOffsetInsideMaskedRange,
  type LiquidMaskedRange,
} from './classify_liquid_position';

type EsqlValidationDiagnostic = Awaited<ReturnType<typeof validateQuery>>['errors'][number];

const UNKNOWN_COLUMN_CODE = 'unknownColumn';
const UNKNOWN_SOURCE_CODES: ReadonlySet<string> = new Set(['unknownDataSource', 'unknownIndex']);
/** Fills structural Liquid spans so they parse as one identifier. */
const PLACEHOLDER_CHAR = 'x';
/** Column ES|QL returns for a wildcard source that matches no index. */
const NO_FIELDS_PLACEHOLDER = '<no-fields>';

/**
 * Longest query that is validated. Parse time grows with length (~0.3 s at
 * 100 KB) and a 1 MB query exhausts the heap. Same value as the ES|QL view limit.
 */
export const MAX_VALIDATED_ESQL_QUERY_LENGTH = 100_000;

export type EsqlQueryDiagnosticSeverity = 'error' | 'warning' | 'info';

/** One ES|QL diagnostic, positioned by offsets relative to the query text. */
export interface EsqlQueryDiagnostic {
  /** Inclusive offset into the query text. */
  start: number;
  /** Exclusive offset into the query text; always greater than `start`. */
  end: number;
  message: string;
  code: string;
  ruleId: Extract<WorkflowValidationRuleId, 'esqlDiagnostic' | 'esqlUnknownSource'>;
  severity: EsqlQueryDiagnosticSeverity;
}

export type EsqlQueryValidationResult =
  | {
      kind: 'validated';
      diagnostics: EsqlQueryDiagnostic[];
      /** A source returned no columns, so field names were not checked. */
      fieldsNotChecked: boolean;
    }
  /**
   * A Liquid `{{ }}` output sits in a structural position, so only grammar was
   * checked, with each such output replaced by a placeholder.
   */
  | { kind: 'grammar-only'; diagnostics: EsqlQueryDiagnostic[] }
  /**
   * The query was not validated: a Liquid span is unclosed, or a `{% %}` tag
   * sits in a structural position.
   */
  | { kind: 'skipped-structural-liquid'; reason: 'unclosed' | 'tag' }
  /** The query is longer than {@link MAX_VALIDATED_ESQL_QUERY_LENGTH}, so it was not validated. */
  | { kind: 'skipped-too-large' }
  /** `validateQuery` threw, e.g. because a callback failed. */
  | { kind: 'failed' };

export interface EsqlQueryValidationOptions {
  /**
   * Skip the validator's module-level column cache. The server sets it: the
   * cache is shared by every request in the process, so without it one user's
   * field list could answer another user's validation.
   */
  invalidateColumnsCache?: boolean;
}

/**
 * Validates one ES|QL query from a workflow step. The editor and the server
 * validator both call this, so they apply the same Liquid policy:
 *
 *   - When every Liquid span sits inside a quoted string literal or a
 *     comment, we mask each span with same-length whitespace and let the
 *     ES|QL parser run normally. Diagnostics that fall *entirely* inside a
 *     mask are suppressed (the parser can't say anything actionable about a
 *     run of spaces standing in for a string literal).
 *   - When a `{% %}` tag occupies a structural position, we skip the query:
 *     a tag can add or remove any text, so no placeholder stands in for it.
 *   - When a `{{ }}` output occupies a structural position (identifier,
 *     keyword, numeric literal, …), we replace it with a same-length
 *     placeholder identifier and check grammar only, without
 *     callbacks. Diagnostics on or right after a placeholder are dropped: we
 *     don't know the runtime substitution, and false positives are worse than
 *     missing ones — they train authors to ignore squigglies and make agents
 *     "fix" correct queries. Grammar errors elsewhere (an unclosed pipe, a
 *     single-quoted string around the Liquid) are still reported.
 *
 * Callbacks decide how deep the check goes: with none, only grammar is
 * checked; with `getSources` / `getColumnsFor`, unknown indices and fields are
 * reported too. When a source returns no columns (no matching index, or no
 * data yet), unknown-column diagnostics are dropped: every field would be
 * "unknown", and an agent "fixing" them rewrites a correct query into a
 * useless one.
 */
export async function validateEsqlQuery(
  esql: string,
  callbacks: ESQLCallbacks,
  options?: EsqlQueryValidationOptions
): Promise<EsqlQueryValidationResult> {
  if (esql.length > MAX_VALIDATED_ESQL_QUERY_LENGTH) {
    return { kind: 'skipped-too-large' };
  }
  const classification = classifyLiquidPosition(esql);
  if (classification.kind === 'has-structural') {
    const { spans } = classification;
    if (!spans) {
      return { kind: 'skipped-structural-liquid', reason: 'unclosed' };
    }
    if (spans.structural.some(({ kind }) => kind === 'tag')) {
      return { kind: 'skipped-structural-liquid', reason: 'tag' };
    }
    return validateGrammarWithPlaceholders(esql, spans);
  }

  const { maskedRanges } = classification;
  const maskedQuery = applyLiquidMask(esql, maskedRanges);

  let sourceWithoutColumns = false;
  const { getColumnsFor } = callbacks;
  const trackedCallbacks: ESQLCallbacks = getColumnsFor
    ? {
        ...callbacks,
        getColumnsFor: async (ctx) => {
          // Returning `[]` for the placeholder also keeps it out of the
          // validator's column cache, which stores non-empty results only, so
          // this callback runs again next time and the flag stays accurate.
          const columns = (await getColumnsFor(ctx)).filter(
            ({ name }) => name !== NO_FIELDS_PLACEHOLDER
          );
          if (columns.length === 0) {
            sourceWithoutColumns = true;
          }
          return columns;
        },
      }
    : callbacks;

  let result: Awaited<ReturnType<typeof validateQuery>>;
  try {
    result = await validateQuery(maskedQuery, trackedCallbacks, options);
  } catch {
    return { kind: 'failed' };
  }

  const diagnostics = [
    ...result.errors.map((error) => toEsqlQueryDiagnostic(error, esql, maskedRanges, 'error')),
    ...result.warnings.map((warning) =>
      toEsqlQueryDiagnostic(warning, esql, maskedRanges, 'warning')
    ),
  ]
    .filter((diagnostic): diagnostic is EsqlQueryDiagnostic => diagnostic !== null)
    .filter(({ code }) => !(sourceWithoutColumns && code === UNKNOWN_COLUMN_CODE));
  return { kind: 'validated', diagnostics, fieldsNotChecked: sourceWithoutColumns };
}

async function validateGrammarWithPlaceholders(
  esql: string,
  {
    masked,
    structural,
  }: { masked: ReadonlyArray<LiquidMaskedRange>; structural: ReadonlyArray<LiquidMaskedRange> }
): Promise<EsqlQueryValidationResult> {
  const query = applyLiquidMask(applyLiquidMask(esql, masked), structural, PLACEHOLDER_CHAR);

  let result: Awaited<ReturnType<typeof validateQuery>>;
  try {
    result = await validateQuery(query);
  } catch {
    return { kind: 'failed' };
  }

  const diagnostics = result.errors
    .map((error) => toEsqlQueryDiagnostic(error, esql, masked, 'error'))
    .filter((diagnostic): diagnostic is EsqlQueryDiagnostic => diagnostic !== null)
    .filter((diagnostic) => !isCausedByPlaceholder(diagnostic, structural, query));
  return { kind: 'grammar-only', diagnostics };
}

/**
 * True when the diagnostic overlaps a placeholder or starts right after one
 * (only whitespace between), e.g. the unit in `NOW() - {{ days }} days`.
 */
function isCausedByPlaceholder(
  { start, end }: EsqlQueryDiagnostic,
  placeholders: ReadonlyArray<LiquidMaskedRange>,
  query: string
): boolean {
  return placeholders.some(
    (placeholder) =>
      (start < placeholder.end && end > placeholder.start) ||
      (start >= placeholder.end && query.slice(placeholder.end, start).trim() === '')
  );
}

function toEsqlQueryDiagnostic(
  diagnostic: EsqlValidationDiagnostic,
  esql: string,
  maskedRanges: ReadonlyArray<LiquidMaskedRange>,
  fallbackSeverity: 'error' | 'warning'
): EsqlQueryDiagnostic | null {
  const innerRange = extractInnerRange(diagnostic, esql);
  if (!innerRange || innerRange.start < 0 || innerRange.end < innerRange.start) {
    return null;
  }
  if (rangeFullyInsideMask(innerRange, maskedRanges)) {
    return null;
  }
  const { message, code } = extractMessageAndCode(diagnostic);
  return {
    start: innerRange.start,
    end: Math.max(innerRange.end, innerRange.start + 1),
    message,
    code,
    ruleId: UNKNOWN_SOURCE_CODES.has(code) ? 'esqlUnknownSource' : 'esqlDiagnostic',
    severity: resolveSeverity(diagnostic, fallbackSeverity),
  };
}

function isEsqlMessage(
  diagnostic: EsqlValidationDiagnostic
): diagnostic is EsqlValidationDiagnostic & {
  type: 'error' | 'warning';
  text: string;
  location: { min: number; max: number };
  code: string;
} {
  return (
    'location' in diagnostic &&
    typeof diagnostic.location === 'object' &&
    diagnostic.location !== null &&
    'min' in diagnostic.location &&
    'max' in diagnostic.location
  );
}

function isEditorError(diagnostic: EsqlValidationDiagnostic): diagnostic is EditorError {
  return (
    'startLineNumber' in diagnostic &&
    typeof diagnostic.startLineNumber === 'number' &&
    typeof diagnostic.startColumn === 'number'
  );
}

function extractInnerRange(
  diagnostic: EsqlValidationDiagnostic,
  esql: string
): { start: number; end: number } | null {
  if (isEsqlMessage(diagnostic)) {
    return { start: diagnostic.location.min, end: diagnostic.location.max + 1 };
  }
  if (isEditorError(diagnostic)) {
    const { message } = diagnostic;
    const start = editorErrorToOffset(
      esql,
      diagnostic.startLineNumber,
      diagnostic.startColumn,
      message
    );
    const end = editorErrorToOffset(esql, diagnostic.endLineNumber, diagnostic.endColumn, message);
    if (start === null || end === null) {
      return null;
    }
    return { start, end: Math.max(start + 1, end) };
  }
  return null;
}

/**
 * The ES|QL grammar reports syntax errors from two ANTLR listeners that place
 * columns differently. The lexer (`token recognition error at: …`) uses the
 * column within the line. The parser (`mismatched input …`, `extraneous
 * input …`, …) uses the offending token's offset from the start of the query,
 * plus one, whatever the line.
 */
function isLexerError(message: string): boolean {
  return message.includes('token recognition error');
}

function editorErrorToOffset(
  text: string,
  line: number,
  column: number,
  message: string
): number | null {
  if (!isLexerError(message)) {
    return column >= 1 ? Math.min(column - 1, text.length) : null;
  }
  return lineColToOffset(text, line, column);
}

function lineColToOffset(text: string, line: number, column: number): number | null {
  if (line < 1 || column < 1) {
    return null;
  }
  let offset = 0;
  let currentLine = 1;
  while (currentLine < line) {
    const idx = text.indexOf('\n', offset);
    if (idx === -1) {
      return null;
    }
    offset = idx + 1;
    currentLine += 1;
  }
  const nextNewline = text.indexOf('\n', offset);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  const clampedColumn = Math.min(column - 1, lineEnd - offset);
  return offset + clampedColumn;
}

function rangeFullyInsideMask(
  range: { start: number; end: number },
  masks: ReadonlyArray<LiquidMaskedRange>
): boolean {
  for (const mask of masks) {
    if (range.start >= mask.start && range.end <= mask.end) {
      return true;
    }
  }
  if (range.end === range.start + 1 && isOffsetInsideMaskedRange(range.start, masks)) {
    return true;
  }
  return false;
}

function extractMessageAndCode(diagnostic: EsqlValidationDiagnostic): {
  message: string;
  code: string;
} {
  if (isEsqlMessage(diagnostic)) {
    return {
      message: diagnostic.text,
      code: diagnostic.code,
    };
  }
  if (isEditorError(diagnostic)) {
    return {
      message: diagnostic.message,
      code: diagnostic.code,
    };
  }
  return {
    message: 'ES|QL validation error',
    code: 'esql.invalid',
  };
}

function resolveSeverity(
  diagnostic: EsqlValidationDiagnostic,
  fallback: 'error' | 'warning'
): EsqlQueryDiagnosticSeverity {
  if (isEsqlMessage(diagnostic)) {
    if (diagnostic.type === 'warning') {
      return 'warning';
    }
    return 'error';
  }
  if (isEditorError(diagnostic)) {
    const raw: string | number = diagnostic.severity;
    if (typeof raw === 'number') {
      if (raw === 4) {
        return 'warning';
      }
      if (raw === 2 || raw === 1) {
        return 'info';
      }
      return 'error';
    }
    if (raw === 'warning') {
      return 'warning';
    }
    if (raw === 'info') {
      return 'info';
    }
    return 'error';
  }
  return fallback;
}
