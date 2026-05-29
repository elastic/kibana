/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LoopStepTypes } from '@kbn/workflows';
import type { ScopeData } from '../../collaborators/scope_data';

// Lazily built so the Set is not constructed at module-load time, avoiding
// circular-initialization issues when jest resolves the @kbn/workflows barrel.
let loopEnterNodeTypes: Set<string> | undefined;

const getLoopEnterNodeTypes = (): Set<string> => {
  if (!loopEnterNodeTypes) {
    loopEnterNodeTypes = new Set<string>(LoopStepTypes.map((t) => `enter-${t}`));
  }
  return loopEnterNodeTypes;
};

export const isLoopEnterScope = (scope: ScopeData): boolean =>
  getLoopEnterNodeTypes().has(scope.nodeType);
