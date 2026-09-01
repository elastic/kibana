/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowDiagnostic } from '@kbn/workflows/types/v1';
import {
  collectAllVariables,
  createStepContextResolver,
  validateLiquidForLoopCollections,
  validateVariables,
} from '@kbn/workflows-yaml';

/**
 * Runs the `variable-validation` rule group the editor runs, so
 * `POST /api/workflows/validate` reports the same rule IDs and severities.
 *
 * Editor decorations are switched off: on the server every valid variable would
 * otherwise allocate a result plus its rendered hover text, which is the bulk of
 * the work on a large workflow and is presentation the API does not return.
 */
export function collectVariableDiagnostics(
  yaml: string,
  workflowDefinition: WorkflowYaml,
  workflowGraph: WorkflowGraph
): WorkflowDiagnostic[] {
  // The editor validates against a document parsed with `keepSourceTokens` and no
  // `mapAsMap`, unlike the one `parseWorkflowYamlToJSON` builds for schema
  // validation. Parsing again here keeps the two surfaces on identical input.
  const lineCounter = new LineCounter();
  const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });

  const variableItems = collectAllVariables(yaml, yamlDocument, lineCounter, workflowGraph);

  // One resolver for both passes: each builds a context schema per step, and
  // building one walks that step's predecessors, so private caches would do the
  // whole traversal twice per request.
  const stepContextResolver = createStepContextResolver(
    workflowDefinition,
    workflowGraph,
    yamlDocument
  );

  const results = [
    ...validateVariables(variableItems, workflowGraph, workflowDefinition, yamlDocument, yaml, {
      includeEditorDecorations: false,
      stepContextResolver,
    }),
    ...validateLiquidForLoopCollections(
      yaml,
      yamlDocument,
      workflowGraph,
      workflowDefinition,
      stepContextResolver
    ),
  ];

  // Decorations carry no rule ID and describe a variable that resolved cleanly.
  return results.flatMap<WorkflowDiagnostic>((result) =>
    result.ruleId && result.severity
      ? [
          {
            severity: result.severity,
            message: result.message,
            source: 'variable',
            ruleId: result.ruleId,
          },
        ]
      : []
  );
}
