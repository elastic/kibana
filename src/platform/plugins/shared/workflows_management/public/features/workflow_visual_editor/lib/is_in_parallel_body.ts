/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from './is_plain_object';

/** The step lists of a parallel step's own body: its `steps`, or each branch's `steps`. */
const parallelBodies = (step: Record<string, unknown>): unknown[] => [
  step.steps,
  ...(Array.isArray(step.branches) ? step.branches.map((b) => isPlainObject(b) && b.steps) : []),
];

/** The `fallback` list of an `on-failure` / `iteration-on-failure` handler. */
const fallbackOf = (handler: unknown): unknown => isPlainObject(handler) && handler.fallback;

/** Every step list nested in a step, in any container: bodies, cases, branches and fallbacks. */
const nestedBodies = (step: Record<string, unknown>): unknown[] => [
  ...parallelBodies(step),
  step.else,
  step.default,
  ...(Array.isArray(step.cases) ? step.cases.map((c) => isPlainObject(c) && c.steps) : []),
  fallbackOf(step['on-failure']),
  fallbackOf(step['iteration-on-failure']),
];

/**
 * True when `stepName` is a direct child of a `parallel` step's body (`steps`, or a branch's
 * `steps`). The engine rejects a step-level `if`, `on-failure` or `timeout` on such a step: the
 * parallel executor walks a branch as a straight line and cannot drive their wrapper nodes.
 */
export const isInParallelBody = (steps: unknown, stepName: string): boolean => {
  if (!Array.isArray(steps)) return false;
  return steps.some((step) => {
    if (!isPlainObject(step)) return false;
    if (
      step.type === 'parallel' &&
      parallelBodies(step).some(
        (body) =>
          Array.isArray(body) &&
          body.some((child) => isPlainObject(child) && child.name === stepName)
      )
    ) {
      return true;
    }
    return nestedBodies(step).some((body) => isInParallelBody(body, stepName));
  });
};
