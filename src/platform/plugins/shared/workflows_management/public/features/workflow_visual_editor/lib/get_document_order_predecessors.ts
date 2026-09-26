/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface PrecedingStepRef {
  readonly name: string;
  readonly type: string;
}

const isStepLike = (
  value: unknown
): value is { name: string; type: string } & Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { name?: unknown }).name === 'string' &&
  typeof (value as { type?: unknown }).type === 'string';

/** Nested step lists on composite steps (mirrors graph_layout visitStepChildren). */
const visitChildLists = (
  step: Record<string, unknown>,
  visit: (children: ReadonlyArray<unknown>) => void
): void => {
  if (Array.isArray(step.steps)) visit(step.steps);
  if (Array.isArray(step.else)) visit(step.else);
  if (Array.isArray(step.default)) visit(step.default);
  if (Array.isArray(step.branches)) {
    for (const branch of step.branches as Array<{ steps?: unknown[] }>) {
      if (Array.isArray(branch.steps)) visit(branch.steps);
    }
  }
  if (Array.isArray(step.cases)) {
    for (const caseItem of step.cases as Array<{ steps?: unknown[] }>) {
      if (Array.isArray(caseItem.steps)) visit(caseItem.steps);
    }
  }
};

/**
 * Steps that appear before `currentStepName` in document order (depth-first).
 * Used by the data-reference picker Steps group.
 *
 * // TODO(slice8): extend for foreach.item and branch-local context so nested
 * scope matches runtime availability, not only document order.
 */
export const getDocumentOrderPredecessors = (
  steps: ReadonlyArray<unknown> | undefined,
  currentStepName: string
): readonly PrecedingStepRef[] => {
  if (!steps || !currentStepName) return [];
  const predecessors: PrecedingStepRef[] = [];
  let found = false;

  const visit = (list: ReadonlyArray<unknown>): void => {
    for (const item of list) {
      if (found) return;
      if (!isStepLike(item)) continue;
      if (item.name === currentStepName) {
        found = true;
        return;
      }
      predecessors.push({ name: item.name, type: item.type });
      // TODO(slice8): foreach.item and branch-local context
      visitChildLists(item, visit);
    }
  };

  visit(steps);
  return predecessors;
};

/**
 * Every step in document order (depth-first). Used when the picker must scope
 * to the whole workflow (e.g. workflow output values evaluated after the run).
 */
export const getAllDocumentOrderSteps = (
  steps: ReadonlyArray<unknown> | undefined
): readonly PrecedingStepRef[] => {
  if (!steps) return [];
  const all: PrecedingStepRef[] = [];

  const visit = (list: ReadonlyArray<unknown>): void => {
    for (const item of list) {
      if (!isStepLike(item)) continue;
      all.push({ name: item.name, type: item.type });
      visitChildLists(item, visit);
    }
  };

  visit(steps);
  return all;
};
