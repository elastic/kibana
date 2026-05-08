/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step } from './types';
import { isStep } from './types';

/**
 * Enumerates every child-step list inside a parent step (`steps`, `else`,
 * `branches[].steps`). Centralises the branching logic so visitors don't
 * each duplicate it.
 */
export const visitStepChildren = (
  step: Step,
  callback: (children: Step[], key: string) => void
): void => {
  const record = step as Record<string, unknown>;

  if ('steps' in record && Array.isArray(record.steps)) {
    callback((record.steps as unknown[]).filter(isStep), 'steps');
  }
  if ('else' in record && Array.isArray(record.else)) {
    callback((record.else as unknown[]).filter(isStep), 'else');
  }
  if ('branches' in record && Array.isArray(record.branches)) {
    for (const branch of record.branches as Array<{ steps?: unknown[] }>) {
      if (Array.isArray(branch.steps)) {
        callback(branch.steps.filter(isStep), 'branches');
      }
    }
  }
};

/**
 * Recursively walks a step tree depth-first, calling `visitor` for every step
 * including nested children inside `steps`, `else`, and `branches[].steps`.
 */
export const walkStepTree = (
  steps: ReadonlyArray<Step>,
  visitor: (step: Step, depth: number, parentStep?: Step) => void,
  depth: number = 0,
  parentStep?: Step
): void => {
  for (const step of steps) {
    visitor(step, depth, parentStep);
    visitStepChildren(step, (children) => {
      walkStepTree(children, visitor, depth + 1, step);
    });
  }
};
