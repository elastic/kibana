/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from './schema';
import { visitNestedSteps } from '../definition/definition_utils';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isKibanaWorkflowStepType = (stepType: string): boolean =>
  stepType.startsWith('kibana.');

export const stepHasIgnoredKibanaFetcher = (step: { type?: string; with?: unknown }): boolean => {
  if (
    typeof step.type !== 'string' ||
    !isKibanaWorkflowStepType(step.type) ||
    !isRecord(step.with)
  ) {
    return false;
  }
  return (
    Object.prototype.hasOwnProperty.call(step.with, 'fetcher') && step.with.fetcher !== undefined
  );
};

/** Step names whose YAML still sets `with.fetcher` on a kibana.* step. */
export const collectIgnoredKibanaFetcherStepNames = (
  steps: WorkflowYaml['steps'] | undefined
): string[] => {
  if (!steps) {
    return [];
  }
  const names: string[] = [];
  visitNestedSteps(steps, ({ step, name }) => {
    if (stepHasIgnoredKibanaFetcher(step)) {
      names.push(name);
    }
  });
  return names;
};
