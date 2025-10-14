/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnyAction, Dispatch, Middleware, MiddlewareAPI } from '@reduxjs/toolkit';
import type { RootState } from './types';
import { setYamlString } from './slice';
import { performComputation } from './utils/computation';

// Debounced computation function
let computationTimeoutId: NodeJS.Timeout | null = null;
const COMPUTATION_DEBOUNCE_MS = 500; // 500ms debounce

const debounceComputation = (
  store: MiddlewareAPI<Dispatch<AnyAction>, any>,
  yamlString: string | undefined
) => {
  // Clear any pending computation
  if (computationTimeoutId) {
    clearTimeout(computationTimeoutId);
    computationTimeoutId = null;
  }

  // Debounce the computation
  computationTimeoutId = setTimeout(() => {
    performComputation(store, yamlString);
    computationTimeoutId = null;
  }, COMPUTATION_DEBOUNCE_MS);
};

// Side effects middleware - computes derived data when yamlString changes (debounced)
export const workflowComputationMiddleware: Middleware =
  (store: MiddlewareAPI<Dispatch<AnyAction>, RootState>) => (next) => (action) => {
    const result = next(action);

    // Only react to yamlString changes
    if (action.type === setYamlString.type) {
      const state = store.getState();
      const { yamlString } = state.workflow;

      // Do computation immediately if yaml string is defined and no previous workflow graph exists
      if (yamlString && !state.workflow.computed) {
        performComputation(store, yamlString);
        return result;
      }

      // Clear any pending computation
      if (computationTimeoutId) {
        clearTimeout(computationTimeoutId);
        computationTimeoutId = null;
      }

      debounceComputation(store, yamlString);
    }

    return result;
  };
