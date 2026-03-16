/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';

type StepLike = Record<string, unknown>;

const WORKFLOW_EXECUTE_TYPES = new Set(['workflow.execute', 'workflow.executeAsync']);

const isDynamicValue = (value: string): boolean => value.includes('{{');

function collectFromSteps(steps: unknown, ids: Set<string>): void {
  if (!Array.isArray(steps)) return;

  for (const step of steps) {
    if (typeof step !== 'object' || step === null) {
      // skip non-object entries
    } else {
      const s = step as StepLike;
      const stepType = s.type;

      if (typeof stepType === 'string' && WORKFLOW_EXECUTE_TYPES.has(stepType)) {
        const withBlock = s.with;
        if (typeof withBlock === 'object' && withBlock !== null) {
          const workflowId = (withBlock as Record<string, unknown>)['workflow-id'];
          if (
            typeof workflowId === 'string' &&
            workflowId.length > 0 &&
            !isDynamicValue(workflowId)
          ) {
            ids.add(workflowId);
          }
        }
      }

      if ('steps' in s) collectFromSteps(s.steps, ids);
      if ('else' in s) collectFromSteps(s.else, ids);
      if ('branches' in s && Array.isArray(s.branches)) {
        for (const branch of s.branches) {
          if (typeof branch === 'object' && branch !== null && 'steps' in branch) {
            collectFromSteps((branch as StepLike).steps, ids);
          }
        }
      }
    }
  }
}

/**
 * Extracts all statically-referenced workflow IDs from a parsed workflow definition.
 * Walks `steps`, `else`, and `branches[].steps` recursively.
 * Skips dynamic/templated values (those containing `{{`).
 */
export const extractReferencedWorkflowIds = (definition: WorkflowYaml): string[] => {
  const ids = new Set<string>();
  collectFromSteps(definition.steps, ids);
  return [...ids];
};
