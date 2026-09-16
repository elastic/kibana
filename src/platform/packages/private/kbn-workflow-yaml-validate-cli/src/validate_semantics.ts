/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateStepNameUniqueness } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { isGraphBuildError, WorkflowGraph } from '@kbn/workflows/graph';
import type { ValidationIssue } from './types';

/**
 * The semantic validation layer: step-name uniqueness and execution-graph (DAG)
 * validity. Reuses Kibana's own validators. Runs on a schema-validated body, so
 * it should only be invoked when the JSON-Schema layer passed. Never throws.
 */
export const validateSemantics = (body: Record<string, unknown>): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const workflow = body as unknown as WorkflowYaml;

  try {
    const { errors } = validateStepNameUniqueness(workflow);
    for (const error of errors) {
      issues.push({ source: 'step-name', message: error.message, path: `steps.${error.stepName}` });
    }
  } catch (error) {
    issues.push({
      source: 'step-name',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
    // Accessing the topological order forces cycle detection (topsort throws on cycles).
    void graph.topologicalOrder;
  } catch (error) {
    const stepId = isGraphBuildError(error) ? error.stepId : undefined;
    issues.push({
      source: 'graph',
      message: error instanceof Error ? error.message : String(error),
      path: stepId ? `steps.${stepId}` : undefined,
    });
  }

  return issues;
};
