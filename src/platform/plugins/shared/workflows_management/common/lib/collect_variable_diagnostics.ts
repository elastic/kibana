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
import type { WorkflowContextRegistry } from '@kbn/workflows-yaml';
import {
  collectAllVariables,
  createStepContextResolver,
  createValidationBudget,
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
 *
 * Spent as the references are collected rather than counted up front, so the
 * collection itself is bounded: a 1 MiB body of short `{{ x }}` holds ~58,000
 * of them and allocated ~36 MiB before a pre-count could refuse it.
 */
export const MAX_VARIABLES_FOR_VARIABLE_VALIDATION = 1000;

/**
 * Liquid for-loop budget. Separate because the unit differs: one loop scope,
 * not one reference. Each costs a template walk plus a context build, and 250
 * steps of 45 loops each — 1 MiB, zero references — measures ~710 ms.
 */
export const MAX_FOR_LOOP_SCOPES_FOR_VARIABLE_VALIDATION = 1000;

export interface VariableDiagnosticsResult {
  diagnostics: WorkflowDiagnostic[];
  /**
   * Set when a budget ran out. Whatever was reached is reported, the rest was
   * not, so callers must surface this instead of implying a clean result.
   */
  notCheckedReason?: string;
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
  registry: WorkflowContextRegistry,
  yaml: string,
  workflowDefinition: WorkflowYaml,
  workflowGraph: WorkflowGraph
): VariableDiagnosticsResult {
  const stepCount = collectAllSteps(workflowDefinition.steps ?? []).length;
  if (stepCount > MAX_STEPS_FOR_VARIABLE_VALIDATION) {
    return {
      diagnostics: [],
      notCheckedReason: `Variable validation skipped: the workflow has ${stepCount} steps, above the limit of ${MAX_STEPS_FOR_VARIABLE_VALIDATION}.`,
    };
  }

  // The editor validates against a document parsed with `keepSourceTokens` and no
  // `mapAsMap`, unlike the one `parseWorkflowYamlToJSON` builds for schema
  // validation. Parsing again here keeps the two surfaces on identical input.
  const lineCounter = new LineCounter();
  const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });

  // Budgets are spent while collecting, so an oversized workflow still gets the
  // rules applied to everything up to the limit instead of nothing at all.
  const referenceBudget = createValidationBudget(MAX_VARIABLES_FOR_VARIABLE_VALIDATION);
  const forLoopBudget = createValidationBudget(MAX_FOR_LOOP_SCOPES_FOR_VARIABLE_VALIDATION);

  const variableItems = collectAllVariables(
    yaml,
    yamlDocument,
    lineCounter,
    workflowGraph,
    referenceBudget
  );

  // One resolver for both passes: each builds a context schema per step, and
  // building one walks that step's predecessors, so private caches would do the
  // whole traversal twice per request.
  const stepContext = createStepContextResolver(
    registry,
    workflowDefinition,
    workflowGraph,
    yamlDocument
  );

  const results = [
    ...validateVariables(stepContext, variableItems, workflowDefinition, yamlDocument, yaml, {
      includeEditorDecorations: false,
    }),
    ...validateLiquidForLoopCollections(
      stepContext,
      yaml,
      yamlDocument,
      lineCounter,
      workflowDefinition,
      forLoopBudget
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

  const overBudget: string[] = [];
  if (referenceBudget.exhausted) {
    overBudget.push(`more than ${MAX_VARIABLES_FOR_VARIABLE_VALIDATION} variable references`);
  }
  if (forLoopBudget.exhausted) {
    overBudget.push(`more than ${MAX_FOR_LOOP_SCOPES_FOR_VARIABLE_VALIDATION} Liquid for-loops`);
  }

  if (overBudget.length > 0) {
    return {
      diagnostics,
      notCheckedReason: `Variable validation is partial: the workflow has ${overBudget.join(
        ' and '
      )}, so the rest of it was not checked.`,
    };
  }

  return { diagnostics };
}
