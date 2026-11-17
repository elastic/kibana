/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step, WorkflowYaml } from '@kbn/workflows';
import { walkStepTree } from '@kbn/workflows';

/**
 * Every step in the definition keyed by name — top-level, branch bodies,
 * foreach frames and `on-failure.fallback` alike. Only real child-step slots are
 * walked, so objects inside a step's `with` payload that happen to carry a `name`
 * and a `type` are never mistaken for steps.
 */
export const collectStepsByName = (
  workflow: WorkflowYaml | undefined
): ReadonlyMap<string, Step> => {
  const byName = new Map<string, Step>();
  walkStepTree(workflow?.steps ?? [], (step) => {
    byName.set(step.name, step);
  });
  return byName;
};
