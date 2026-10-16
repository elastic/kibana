/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from 'yaml';
import { isMap, isScalar, isSeq, LineCounter, parseDocument } from 'yaml';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { WorkflowDiagnostic } from '@kbn/workflows/types/v1';
import {
  ESQL_QUERY_STEP_TYPE,
  type EsqlStepRegion,
  extractEsqlRegionFromScalar,
} from './extract_esql_region';
import { type EsqlQueryDiagnostic, validateEsqlQuery } from './validate_esql_query';

interface EsqlStepLocation {
  stepName: string | undefined;
  /** Path of the `with.query` value, e.g. `['steps', 0, 'with', 'query']`. */
  path: Array<string | number>;
  region: EsqlStepRegion;
}

/** One ES|QL diagnostic in YAML coordinates (1-based line and column). */
export interface EsqlStepDiagnostic extends EsqlQueryDiagnostic {
  stepName: string | undefined;
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
  const locations = findEsqlSteps(document.contents, [], yaml);
  const results = await Promise.all(
    locations.map((location) =>
      validateEsqlQuery(location.region.esql, callbacks, { invalidateColumnsCache: true })
    )
  );

  const diagnostics: EsqlStepDiagnostic[] = [];
  const notChecked: string[] = [];
  results.forEach((result, index) => {
    const { stepName, path, region } = locations[index];
    const label = stepName ? `step "${stepName}"` : `step at ${path.join('.')}`;
    if (result.kind === 'skipped-structural-liquid') {
      notChecked.push(
        `ES|QL query of ${label}: it has an unclosed Liquid tag, so the query cannot be validated before it runs.`
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
      const { line, col } = lineCounter.linePos(region.contentStartInFile + diagnostic.start);
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

/** Walks every map in the document and returns the ES|QL query steps, in document order. */
function findEsqlSteps(
  node: Node | null,
  path: Array<string | number>,
  yaml: string
): EsqlStepLocation[] {
  if (isSeq(node)) {
    return node.items.flatMap((item, index) => findEsqlSteps(item as Node, [...path, index], yaml));
  }
  if (!isMap(node)) {
    return [];
  }

  const found: EsqlStepLocation[] = [];
  if (node.get('type') === ESQL_QUERY_STEP_TYPE) {
    const queryNode = node.getIn(['with', 'query'], true);
    const region = isScalar(queryNode) ? extractEsqlRegionFromScalar(queryNode, yaml) : null;
    if (region && region.esql.trim().length > 0) {
      const name = node.get('name');
      found.push({
        stepName: typeof name === 'string' ? name : undefined,
        path: [...path, 'with', 'query'],
        region,
      });
    }
  }
  for (const pair of node.items) {
    const key = isScalar(pair.key) ? pair.key.value : undefined;
    if (typeof key === 'string' || typeof key === 'number') {
      found.push(...findEsqlSteps(pair.value as Node, [...path, key], yaml));
    }
  }
  return found;
}
