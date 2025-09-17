/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackEntry } from '@kbn/workflows';

/**
 * Builds a deterministic step path from a stack of execution entries.
 *
 * This function is crucial for handling scoped operations like foreach, if, retry,
 * continue, fallback, and other nested workflow constructs. It generates a consistent
 * path representation that can be used to track execution flow and state across
 * complex workflow hierarchies.
 *
 * The function processes the execution stack to create a flattened path array,
 * ensuring deterministic results for the same input regardless of execution context.
 * It handles deduplication of consecutive step IDs and properly incorporates
 * sub-scope identifiers when present.
 *
 * @param stepId - The current step identifier being processed
 * @param stack - Array of stack entries representing the execution hierarchy
 * @returns A string array representing the deterministic step path
 */
export function buildStepPath(stepId: string, stack: StackEntry[]): string[] {
  stack = stack.slice();

  if (stack.length) {
    const lastStackEntry = stack[stack.length - 1];

    if (lastStackEntry.stepId === stepId && !lastStackEntry.subScopeId) {
      stack.pop();
    }
  }

  let previousStepId: string | undefined;
  return stack.flatMap((stackEntry) => {
    const parts = [];

    if (previousStepId !== stackEntry.stepId) {
      parts.push(stackEntry.stepId);
      previousStepId = stackEntry.stepId;
    }

    if (stackEntry.subScopeId !== undefined) {
      parts.push(stackEntry.subScopeId);
    }

    return parts;
  });
}
