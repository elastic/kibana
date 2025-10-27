/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnyAction, Dispatch, Middleware, MiddlewareAPI } from '@reduxjs/toolkit';
import { _setComputedDataInternal, clearComputedData, setYamlString } from './slice';
import type { RootState } from './types';
import { performComputation } from './utils/computation';

// Debounced computation function
let computationTimeoutId: NodeJS.Timeout | null = null;
const COMPUTATION_DEBOUNCE_MS = 500; // 500ms debounce

const debounceComputation = (
  store: MiddlewareAPI<Dispatch<AnyAction>, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  yamlString: string | undefined
) => {
  // Note: timeout clearing is handled in the middleware before this function is called

  // Schedule the debounced computation
  computationTimeoutId = setTimeout(() => {
    // Get fresh state at execution time, not at scheduling time
    const state = store.getState();
    const computed = performComputation(yamlString, state.workflow.schemaLoose);

    if (computed) {
      store.dispatch(_setComputedDataInternal(computed));
    } else {
      store.dispatch(clearComputedData());
    }
    computationTimeoutId = null;
  }, COMPUTATION_DEBOUNCE_MS);
};

// Side effects middleware - computes derived data when yamlString changes (debounced)
export const workflowComputationMiddleware: Middleware =
  (store: MiddlewareAPI<Dispatch<AnyAction>, RootState>) => (next) => (action) => {
    const result = next(action);

    // Only react to yamlString changes
    if (action.type === setYamlString.type) {
      // Clear any pending computation first (before checking state)
      if (computationTimeoutId) {
        clearTimeout(computationTimeoutId);
        computationTimeoutId = null;
      }

      const state = store.getState();
      const { yamlString } = state.workflow;

      // If yamlString is empty/undefined, clear computed data and return
      if (!yamlString) {
        store.dispatch(clearComputedData());
        return result;
      }

      // Do computation immediately if not initialized yet
      if (!state.workflow.isInitialized) {
        const computed = performComputation(yamlString, state.workflow.schemaLoose);

        if (computed) {
          store.dispatch(_setComputedDataInternal(computed));
        } else {
          store.dispatch(clearComputedData());
        }

        return result;
      }

      // Otherwise, debounce subsequent changes
      debounceComputation(store, yamlString);
    }

    return result;
  };
