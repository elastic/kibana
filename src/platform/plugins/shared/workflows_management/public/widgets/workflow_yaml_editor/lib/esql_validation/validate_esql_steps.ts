/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import type { YamlValidationResult } from '@kbn/workflows-yaml';
import { collectEsqlRegionsFromLookup } from './extract_esql_region';
import {
  type EsqlStepRegion,
  getEsqlToValidate,
  toFileRange,
} from '../../../../../common/lib/esql_validation/extract_esql_region';
import {
  type EsqlQueryDiagnostic,
  validateEsqlQuery,
} from '../../../../../common/lib/esql_validation/validate_esql_query';
import type { WorkflowLookup } from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

/**
 * Runs `validateQuery` against every `elasticsearch.esql.query` step in the
 * workflow lookup and returns workflow-style `YamlValidationResult`s in YAML
 * coordinates. The host pipeline (`collectFullWorkflowYamlValidationResults`) batches
 * these into markers and feeds the bottom-bar accordion alongside every other validator.
 *
 * The Liquid policy lives in {@link validateEsqlQuery}, shared with the server
 * validator so the editor and `POST /api/workflows/validate` agree.
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
    const region = regions[regionIdx];
    const result = await validateEsqlQuery(getEsqlToValidate(region), callbacks);
    if (signal?.aborted) {
      return [];
    }
    if (result.kind === 'validated' || result.kind === 'grammar-only') {
      result.diagnostics.forEach((diagnostic, diagnosticIdx) => {
        const v = toValidationResult(diagnostic, region, model, regionIdx, diagnosticIdx);
        if (v) {
          out.push(v);
        }
      });
    }
  }
  return out;
}

function toValidationResult(
  diagnostic: EsqlQueryDiagnostic,
  region: EsqlStepRegion,
  model: monaco.editor.ITextModel,
  regionIdx: number,
  diagnosticIdx: number
): YamlValidationResult | null {
  const { start: startOffset, end: endOffset } = toFileRange(
    region,
    diagnostic.start,
    diagnostic.end
  );

  const maxOffset = model.getValueLength();
  const safeStart = Math.min(startOffset, maxOffset);
  const safeEnd = Math.min(Math.max(endOffset, safeStart + 1), maxOffset);
  const startPos = model.getPositionAt(safeStart);
  const endPos = model.getPositionAt(safeEnd);

  return {
    id: `esql-validation-${regionIdx}-${diagnosticIdx}-${diagnostic.code}`,
    severity: diagnostic.severity,
    message: diagnostic.message,
    owner: 'esql-validation',
    ruleId: diagnostic.ruleId,
    source: 'esql',
    startLineNumber: startPos.lineNumber,
    startColumn: startPos.column,
    endLineNumber: endPos.lineNumber,
    endColumn: endPos.column,
    hoverMessage: null,
  };
}
