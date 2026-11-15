/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ITERATION_STEP_ID_PREFIX = 'iteration-';

/**
 * Foreach iteration steps use `iteration-{n}`; while scope ids are still a bare
 * index (`"0"`). Returns NaN when the id is not a loop ordinal.
 */
export function parseIterationIndex(stepId: string): number {
  const raw = stepId.startsWith(ITERATION_STEP_ID_PREFIX)
    ? stepId.slice(ITERATION_STEP_ID_PREFIX.length)
    : stepId;
  return Number.parseInt(raw, 10);
}
