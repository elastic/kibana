/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { walkStepTree } from '@kbn/workflows';

/**
 * The trimmed name of every step in the workflow, whichever container it sits in (bodies, else,
 * cases, default, parallel branches, and the fallbacks of `on-failure` / `iteration-on-failure`).
 */
export const collectStepNames = (steps: WorkflowYaml['steps'] | undefined): ReadonlySet<string> => {
  const names = new Set<string>();
  walkStepTree(steps ?? [], ({ name }) => {
    const trimmed = name.trim();
    if (trimmed) names.add(trimmed);
  });
  return names;
};
