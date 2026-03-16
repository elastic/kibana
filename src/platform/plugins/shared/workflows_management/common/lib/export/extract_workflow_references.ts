/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';

import {
  isDynamicWorkflowReference,
  WORKFLOW_EXECUTE_TYPES,
  WORKFLOW_REFERENCE_KEY,
} from './workflow_import_constants';
import { isRecord } from '../type_guards';

function collectFromSteps(steps: unknown, ids: Set<string>): void {
  if (!Array.isArray(steps)) return;

  for (const step of steps) {
    if (!isRecord(step)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const { type: stepType } = step;

    if (typeof stepType === 'string' && WORKFLOW_EXECUTE_TYPES.has(stepType)) {
      const { with: withBlock } = step;
      if (isRecord(withBlock)) {
        const workflowId = withBlock[WORKFLOW_REFERENCE_KEY];
        if (
          typeof workflowId === 'string' &&
          workflowId.length > 0 &&
          !isDynamicWorkflowReference(workflowId)
        ) {
          ids.add(workflowId);
        }
      }
    }

    if ('steps' in step) collectFromSteps(step.steps, ids);
    if ('else' in step) collectFromSteps(step.else, ids);
    if ('branches' in step && Array.isArray(step.branches)) {
      for (const branch of step.branches) {
        if (isRecord(branch) && 'steps' in branch) {
          collectFromSteps(branch.steps, ids);
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
