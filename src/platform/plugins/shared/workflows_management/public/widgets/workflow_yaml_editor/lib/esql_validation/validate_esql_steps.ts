/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { validateQuery } from '@kbn/esql-language';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import {
  applyLiquidMask,
  classifyLiquidPosition,
  isOffsetInsideMaskedRange,
  type LiquidMaskedRange,
} from './classify_liquid_position';
import { type EsqlStepRegion, findEsqlStepRegions } from './find_esql_step_regions';
import type { YamlValidationResult } from '../../../../features/validate_workflow_yaml/model/types';

/**
 * Runs `validateQuery` against every `elasticsearch.esql.query` step in the
 * document and returns workflow-style `YamlValidationResult`s in YAML
 * coordinates. The host pipeline (`useYamlValidation`) batches these into
 * markers and feeds the bottom-bar accordion alongside every other validator.
 *
 * Liquid handling matches the policy used elsewhere in the editor:
 *
 *   - When every Liquid span sits inside a quoted string literal or a
 *     comment, we mask each span with same-length whitespace and let the
 *     ES|QL parser run normally. Diagnostics that fall *entirely* inside a
 *     mask are suppressed (the parser can't say anything actionable about a
 *     run of spaces standing in for a string literal).
 *   - When at least one Liquid span occupies a structural position
 *     (identifier, keyword, numeric literal, …), we skip the entire region.
 *     We can't honestly validate something whose runtime substitution we
 *     don't know, and false positives in editor diagnostics are worse than
 *     missing ones — they train authors to ignore squigglies.
 *
 * Mirrors the KQL/if-condition policy in [validate_trigger_conditions.ts]
 * and [validate_if_conditions.ts] which also bail out on Liquid presence.
 */
export async function validateEsqlSteps(
  document: Document | null | undefined,
  model: monaco.editor.ITextModel,
  callbacks: ESQLCallbacks,
  signal?: AbortSignal
): Promise<YamlValidationResult[]> {
  const modelText = model.getValue();
  const regions = findEsqlStepRegions(document, modelText);
  if (regions.length === 0) {
    return [];
  }

  const out: YamlValidationResult[] = [];
  for (let regionIdx = 0; regionIdx < regions.length; regionIdx++) {
    if (signal?.aborted) return [];
    const regionResults = await validateRegion(
      regions[regionIdx],
      regionIdx,
      model,
      callbacks,
      signal
    );
    if (signal?.aborted) return [];
    out.push(...regionResults);
  }
  return out;
}

async function validateRegion(
  region: EsqlStepRegion,
  regionIdx: number,
  model: monaco.editor.ITextModel,
  callbacks: ESQLCallbacks,
  signal: AbortSignal | undefined
): Promise<YamlValidationResult[]> {
  const classification = classifyLiquidPosition(region.esql);
  // Liquid sits where ES|QL expects syntax. Skip honestly — the runtime
  // substitution might produce a perfectly valid query, or might not, but
  // either way we can't tell from edit-time text alone.
  if (classification.kind === 'has-structural') {
    return [];
  }

  const maskedRanges = classification.kind === 'all-maskable' ? classification.maskedRanges : [];
  const maskedQuery = applyLiquidMask(region.esql, maskedRanges);

  // safeValidate swallows per-query failures so a single bad step can't
  // prevent the rest of the workflow from being validated.
  const result = await safeValidate(maskedQuery, callbacks);
  if (signal?.aborted || !result) {
    return [];
  }

  const out: YamlValidationResult[] = [];
  let diagnosticIdx = 0;
  for (const error of result.errors) {
    const v = toValidationResult(
      error,
      region,
      maskedRanges,
      model,
      'error',
      regionIdx,
      diagnosticIdx++
    );
    if (v) out.push(v);
  }
  for (const warning of result.warnings) {
    const v = toValidationResult(
      warning,
      region,
      maskedRanges,
      model,
      'warning',
      regionIdx,
      diagnosticIdx++
    );
    if (v) out.push(v);
  }
  return out;
}

async function safeValidate(
  query: string,
  callbacks: ESQLCallbacks
): Promise<Awaited<ReturnType<typeof validateQuery>> | null> {
  try {
    return await validateQuery(query, callbacks);
  } catch {
    return null;
  }
}

type EsqlDiagnostic =
  | {
      type: 'error' | 'warning';
      text: string;
      location: { min: number; max: number };
      code: string;
    }
  | {
      message: string;
      code: string;
      severity: 'error' | 'warning' | number;
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };

function toValidationResult(
  diagnostic: unknown,
  region: EsqlStepRegion,
  maskedRanges: ReadonlyArray<LiquidMaskedRange>,
  model: monaco.editor.ITextModel,
  fallbackSeverity: 'error' | 'warning',
  regionIdx: number,
  diagnosticIdx: number
): YamlValidationResult | null {
  const innerRange = extractInnerRange(diagnostic, region.esql);
  if (!innerRange) return null;
  // Diagnostics whose range is entirely inside a mask are noise — they
  // describe the run of spaces we put there. Anything that *touches* a mask
  // boundary but extends outside it stays: the parser is reporting on the
  // surrounding ES|QL, not on the mask itself.
  if (rangeFullyInsideMask(innerRange, maskedRanges)) return null;

  const startOffset = region.contentStartInFile + innerRange.start;
  const endOffset = region.contentStartInFile + innerRange.end;
  if (startOffset < 0 || endOffset < startOffset) return null;

  const maxOffset = model.getValueLength();
  const safeStart = Math.min(startOffset, maxOffset);
  const safeEnd = Math.min(Math.max(endOffset, safeStart + 1), maxOffset);
  const startPos = model.getPositionAt(safeStart);
  const endPos = model.getPositionAt(safeEnd);

  const { message, code } = extractMessageAndCode(diagnostic);
  const severity = resolveSeverity(diagnostic, fallbackSeverity);

  return {
    id: `esql-validation-${regionIdx}-${diagnosticIdx}-${code}`,
    severity,
    message,
    owner: 'esql-validation',
    source: 'esql',
    startLineNumber: startPos.lineNumber,
    startColumn: startPos.column,
    endLineNumber: endPos.lineNumber,
    endColumn: endPos.column,
    hoverMessage: null,
  };
}

function extractInnerRange(
  diagnostic: unknown,
  esql: string
): { start: number; end: number } | null {
  if (typeof diagnostic !== 'object' || diagnostic === null) return null;
  const d = diagnostic as Partial<EsqlDiagnostic>;
  if ('location' in d && d.location && typeof d.location === 'object') {
    const loc = d.location as { min?: number; max?: number };
    if (typeof loc.min === 'number' && typeof loc.max === 'number') {
      return { start: loc.min, end: loc.max + 1 };
    }
  }
  if (
    'startLineNumber' in d &&
    typeof d.startLineNumber === 'number' &&
    typeof d.startColumn === 'number' &&
    typeof d.endLineNumber === 'number' &&
    typeof d.endColumn === 'number'
  ) {
    const start = lineColToOffset(esql, d.startLineNumber, d.startColumn);
    const end = lineColToOffset(esql, d.endLineNumber, d.endColumn);
    if (start === null || end === null) return null;
    return { start, end: Math.max(start + 1, end) };
  }
  return null;
}

function lineColToOffset(text: string, line: number, column: number): number | null {
  if (line < 1 || column < 1) return null;
  let offset = 0;
  let currentLine = 1;
  while (currentLine < line) {
    const idx = text.indexOf('\n', offset);
    if (idx === -1) return null;
    offset = idx + 1;
    currentLine += 1;
  }
  return offset + (column - 1);
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
  // `isOffsetInsideMaskedRange` is intentionally re-used here as a defensive
  // check for the edge case where a diagnostic reports a single-character
  // range inside a mask (start == end-1, both inside).
  if (range.end === range.start + 1 && isOffsetInsideMaskedRange(range.start, masks)) {
    return true;
  }
  return false;
}

function extractMessageAndCode(diagnostic: unknown): { message: string; code: string } {
  const d = diagnostic as { text?: string; message?: string; code?: string };
  return {
    message: d.text ?? d.message ?? 'ES|QL validation error',
    code: d.code ?? 'esql.invalid',
  };
}

function resolveSeverity(
  diagnostic: unknown,
  fallback: 'error' | 'warning'
): 'error' | 'warning' | 'info' {
  const d = diagnostic as { type?: string; severity?: string | number };
  const raw = d.type ?? d.severity ?? fallback;
  if (raw === 'warning') return 'warning';
  if (raw === 'info') return 'info';
  return 'error';
}
