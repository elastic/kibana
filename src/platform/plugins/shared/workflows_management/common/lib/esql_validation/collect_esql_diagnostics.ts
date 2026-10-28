/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { WorkflowDiagnostic } from '@kbn/workflows/types/v1';
import { buildWorkflowLookup } from '@kbn/workflows-yaml';
import {
  collectEsqlStepsFromLookup,
  ESQL_QUERY_STEP_TYPE,
  getEsqlToValidate,
  toFileRange,
} from './extract_esql_region';
import {
  type EsqlQueryDiagnostic,
  MAX_VALIDATED_ESQL_QUERY_LENGTH,
  validateEsqlQuery,
} from './validate_esql_query';

/** One ES|QL diagnostic in YAML coordinates (1-based line and column). */
export interface EsqlStepDiagnostic extends EsqlQueryDiagnostic {
  stepName: string;
  path: Array<string | number>;
  line: number;
  column: number;
}

export interface CollectEsqlDiagnosticsResult {
  diagnostics: WorkflowDiagnostic[];
  /** Steps whose query could not be checked, each with the reason. */
  notChecked: string[];
}

/**
 * Validates the query of every `elasticsearch.esql.query` step in a workflow
 * YAML and returns the findings in YAML coordinates. Uses the same Liquid
 * policy as the editor (see {@link validateEsqlQuery}).
 */
export async function collectEsqlStepDiagnostics(
  yaml: string,
  callbacks: ESQLCallbacks
): Promise<{ diagnostics: EsqlStepDiagnostic[]; notChecked: string[] }> {
  if (!yaml.includes(ESQL_QUERY_STEP_TYPE)) {
    return { diagnostics: [], notChecked: [] };
  }

  const lineCounter = new LineCounter();
  const document = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
  const locations = collectEsqlStepsFromLookup(buildWorkflowLookup(document, lineCounter), yaml);
  const results = await Promise.all(
    locations.map((location) =>
      validateEsqlQuery(getEsqlToValidate(location.region), callbacks, {
        invalidateColumnsCache: true,
      })
    )
  );

  const diagnostics: EsqlStepDiagnostic[] = [];
  const notChecked: string[] = [];
  results.forEach((result, index) => {
    const {
      step: { stepId: stepName, path: stepPath },
      region,
    } = locations[index];
    const path = [...stepPath, 'with', 'query'];
    const label = `step "${stepName}"`;
    if (result.kind === 'skipped-too-large') {
      notChecked.push(
        `ES|QL query of ${label}: it is longer than ${MAX_VALIDATED_ESQL_QUERY_LENGTH} characters, so it was not validated.`
      );
      return;
    }
    if (result.kind === 'skipped-structural-liquid') {
      const cause =
        result.reason === 'unclosed'
          ? 'it has an unclosed Liquid tag'
          : 'it has a Liquid {% %} tag outside a string literal';
      notChecked.push(
        `ES|QL query of ${label}: ${cause}, so the query cannot be validated before it runs.`
      );
      return;
    }
    if (result.kind === 'grammar-only') {
      notChecked.push(
        `ES|QL query of ${label}: Liquid is used outside a string literal, so only the grammar was checked, not indices or fields.`
      );
    }
    if (result.kind === 'failed') {
      notChecked.push(`ES|QL query of ${label}: the ES|QL validator failed to run.`);
      return;
    }
    if (result.kind === 'validated' && result.fieldsNotChecked) {
      notChecked.push(
        `ES|QL query of ${label}: field names were not checked because a source in the query returned no columns on this cluster.`
      );
    }
    for (const diagnostic of result.diagnostics) {
      const { start } = toFileRange(region, diagnostic.start, diagnostic.end);
      const { line, col } = lineCounter.linePos(start);
      diagnostics.push({ ...diagnostic, stepName, path, line, column: col });
    }
  });

  return { diagnostics, notChecked };
}

/**
 * {@link collectEsqlStepDiagnostics} shaped as workflow diagnostics with
 * `source: 'esql'`, for `validate_workflow` and the `generate_workflow` graph.
 */
export async function collectEsqlDiagnostics(
  yaml: string,
  callbacks: ESQLCallbacks
): Promise<CollectEsqlDiagnosticsResult> {
  const { diagnostics, notChecked } = await collectEsqlStepDiagnostics(yaml, callbacks);
  return {
    diagnostics: diagnostics.map(({ severity, message, path, line, column, ruleId }) => ({
      severity,
      message: `ES|QL: ${message} (line ${line}, column ${column})`,
      source: 'esql',
      path,
      ruleId,
    })),
    notChecked,
  };
}
