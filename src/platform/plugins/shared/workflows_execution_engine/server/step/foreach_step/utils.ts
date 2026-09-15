/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ITERATION_STEP_ID_PREFIX = 'iteration-';

export const ITERATION_STEP_TYPE = 'foreach-iteration';

export function iterationStepIdFromIndex(index: number): string {
  return `iteration-${index}`;
}

export function indexFromIterationStepId(stepId: string): number {
  return Number(stepId.replace(ITERATION_STEP_ID_PREFIX, ''));
}

/** Evaluated list snapshotted onto foreach `input.items` at loop entry. */
export function extractForeachItemsFromInput(input: unknown): unknown[] | undefined {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }

  const { items } = input as { items?: unknown };
  return Array.isArray(items) ? items : undefined;
}
