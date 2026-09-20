/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';

const isStepLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).name === 'string' &&
  typeof (value as Record<string, unknown>).type === 'string';

/**
 * Every step in the definition keyed by name — top-level, branch bodies,
 * foreach frames and `on-failure.fallback` alike.
 */
export const collectStepsByName = (
  workflow: WorkflowYaml | undefined
): ReadonlyMap<string, Record<string, unknown>> => {
  const byName = new Map<string, Record<string, unknown>>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value !== 'object' || value === null) return;
    if (isStepLike(value)) {
      byName.set(value.name as string, value);
    }
    Object.values(value).forEach(walk);
  };
  walk(workflow?.steps ?? []);
  return byName;
};
