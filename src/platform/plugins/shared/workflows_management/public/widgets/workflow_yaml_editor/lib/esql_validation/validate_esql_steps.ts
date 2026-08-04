/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EditorError } from '@elastic/esql/types';
import type { LineCounter } from 'yaml';
import { validateQuery } from '@kbn/esql-language';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import {
  applyLiquidMask,
  classifyLiquidPosition,
  isOffsetInsideMaskedRange,
  type LiquidMaskedRange,
} from './classify_liquid_position';
import { collectEsqlRegionsFromLookup, type EsqlStepRegion } from './extract_esql_region';
import type { WorkflowLookup } from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { YamlValidationResult } from '../../../../features/validate_workflow_yaml/model/types';

type EsqlValidationDiagnostic = Awaited<ReturnType<typeof validateQuery>>['errors'][number];

/**
 * Runs `validateQuery` against every `elasticsearch.esql.query` step in the
 * workflow lookup and returns workflow-style `YamlValidationResult`s in YAML
 * coordinates. The host pipeline (`collectFullWorkflowYamlValidationResults`) batches
 * these into markers and feeds the bottom-bar accordion alongside every other validator.
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
  workflowLookup: WorkflowLookup,
  _lineCounter: LineCounter,
  model: monaco.editor.ITextModel,
  callbacks: ESQLCallbacks,
  signal?: AbortSignal
): Promise<YamlValidationResult[]> {
  const modelText = model.getValue();
  const regions = collectEsqlRegionsFromLookup(workflowLookup, modelText);
  if (regions.length === 0) {
    return [];
  }

  const out: YamlValidationResult[] = [];
  for (let regionIdx = 0; regionIdx < regions.length; regionIdx++) {
    if (signal?.aborted) {
      return [];
    }
    const regionResults = await validateRegion(
      regions[regionIdx],
      regionIdx,
      model,
      callbacks,
      signal
    );
    if (signal?.aborted) {
      return [];
    }
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
  if (classification.kind === 'has-structural') {
    return [];
  }

  const maskedRanges = classification.maskedRanges;
  const maskedQuery = applyLiquidMask(region.esql, maskedRanges);

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
    if (v) {
      out.push(v);
    }
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
    if (v) {
      out.push(v);
    }
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

function toValidationResult(
  diagnostic: EsqlValidationDiagnostic,
  region: EsqlStepRegion,
  maskedRanges: ReadonlyArray<LiquidMaskedRange>,
  model: monaco.editor.ITextModel,
  fallbackSeverity: 'error' | 'warning',
  regionIdx: number,
  diagnosticIdx: number
): YamlValidationResult | null {
  const innerRange = extractInnerRange(diagnostic, region.esql);
  if (!innerRange) {
    return null;
  }
  if (rangeFullyInsideMask(innerRange, maskedRanges)) {
    return null;
  }

  const startOffset = region.contentStartInFile + innerRange.start;
  const endOffset = region.contentStartInFile + innerRange.end;
  if (startOffset < 0 || endOffset < startOffset) {
    return null;
  }

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
    const start = lineColToOffset(esql, diagnostic.startLineNumber, diagnostic.startColumn);
    const end = lineColToOffset(esql, diagnostic.endLineNumber, diagnostic.endColumn);
    if (start === null || end === null) {
      return null;
    }
    return { start, end: Math.max(start + 1, end) };
  }
  return null;
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
): 'error' | 'warning' | 'info' {
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
