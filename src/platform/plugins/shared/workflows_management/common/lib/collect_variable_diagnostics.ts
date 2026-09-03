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
import { collectAllSteps } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowDiagnostic } from '@kbn/workflows/types/v1';
import {
  collectAllVariables,
  createStepContextResolver,
  validateLiquidForLoopCollections,
  validateVariables,
} from '@kbn/workflows-yaml';

/**
 * Step budget. Building a step's context schema walks that step's predecessors,
 * so per-step cost grows with the step count. This path is synchronous, so the
 * budget is what one request may hold the event loop for.
 *
 * Worst case at the two caps below — that many steps sharing that many
 * references — measures ~60 ms and ~59 MiB, one event-loop tick. A workflow at
 * the route's own 1 MiB body limit carries roughly 5,000 steps and is refused
 * here; before the caps existed it exhausted the Node heap and took the process
 * down.
 */
export const MAX_STEPS_FOR_VARIABLE_VALIDATION = 250;

/**
 * Reference budget, the other cost dimension, and the steeper one at scale:
 * 20,000 references measures ~800 ms / ~440 MiB regardless of step count.
 */
export const MAX_VARIABLES_FOR_VARIABLE_VALIDATION = 1000;

export interface VariableDiagnosticsResult {
  diagnostics: WorkflowDiagnostic[];
  /**
   * Set when the workflow exceeded a budget and the rules did not run. The
   * absence of diagnostics then means "not checked", not "nothing wrong", so
   * callers must report it separately instead of implying a clean result.
   */
  notRunReason?: string;
}

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
): VariableDiagnosticsResult {
  const stepCount = collectAllSteps(workflowDefinition.steps ?? []).length;
  if (stepCount > MAX_STEPS_FOR_VARIABLE_VALIDATION) {
    return {
      diagnostics: [],
      notRunReason: `Variable validation skipped: the workflow has ${stepCount} steps, above the limit of ${MAX_STEPS_FOR_VARIABLE_VALIDATION}.`,
    };
  }

  // The editor validates against a document parsed with `keepSourceTokens` and no
  // `mapAsMap`, unlike the one `parseWorkflowYamlToJSON` builds for schema
  // validation. Parsing again here keeps the two surfaces on identical input.
  const lineCounter = new LineCounter();
  const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });

  const variableItems = collectAllVariables(yaml, yamlDocument, lineCounter, workflowGraph);
  if (variableItems.length > MAX_VARIABLES_FOR_VARIABLE_VALIDATION) {
    return {
      diagnostics: [],
      notRunReason: `Variable validation skipped: the workflow has ${variableItems.length} variable references, above the limit of ${MAX_VARIABLES_FOR_VARIABLE_VALIDATION}.`,
    };
  }

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
      lineCounter,
      workflowGraph,
      workflowDefinition,
      stepContextResolver
    ),
  ];

  // Decorations carry no rule ID and describe a variable that resolved cleanly.
  const diagnostics = results.flatMap<WorkflowDiagnostic>((result) =>
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

  return { diagnostics };
}
