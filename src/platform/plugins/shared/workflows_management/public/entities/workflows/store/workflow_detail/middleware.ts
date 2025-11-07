/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnyAction, Dispatch, Middleware, MiddlewareAPI } from '@reduxjs/toolkit';
import { debounce } from 'lodash';
import { selectYamlForEditor } from './selectors';
import {
  _clearComputedData,
  _setComputedDataInternal,
  setActiveTab,
  setExecution,
  setYamlString,
} from './slice';
import type { RootState } from '../types';
import { performComputation } from '../utils/computation';

const COMPUTATION_DEBOUNCE_MS = 100; // 100ms debounce

const compute = (
  yamlString: string | undefined,
  store: MiddlewareAPI<Dispatch<AnyAction>, RootState>
) => {
  // Get fresh state at execution time, not at scheduling time
  const state = store.getState();
  const computed = performComputation(yamlString, state.detail.schemaLoose);
  if (computed) {
    store.dispatch(_setComputedDataInternal(computed));
  } else {
    store.dispatch(_clearComputedData());
  }
};

const debouncedCompute = debounce(compute, COMPUTATION_DEBOUNCE_MS);

/**
 * Triggers computation with the appropriate YAML string based on current state.
 */
const triggerComputation = (store: MiddlewareAPI<Dispatch<AnyAction>, RootState>) => {
  debouncedCompute.cancel();
  const state = store.getState();
  const yamlString = selectYamlForEditor(state); // Use the yaml being used in the editor (current workflow yaml or execution yaml)
  const { computed } = state.detail;

  // If yamlString is empty/undefined, clear computed data and return
  if (!yamlString) {
    store.dispatch(_clearComputedData());
    return;
  }

  // Do computation immediately if not initialized yet, (computed is only undefined when never set)
  if (!computed) {
    compute(yamlString, store);
  } else {
    debouncedCompute(yamlString, store);
  }
};

// Side effects middleware - computes derived data when yamlString, execution, or activeTab changes (debounced)
const workflowComputationMiddleware: Middleware =
  (store: MiddlewareAPI<Dispatch<AnyAction>, RootState>) => (next) => (action) => {
    const result = next(action);

    // React to changes that affect which YAML should be used for computation
    if (setYamlString.match(action) || setExecution.match(action) || setActiveTab.match(action)) {
      triggerComputation(store);
    }

    return result;
  };

export const workflowDetailMiddleware: Middleware[] = [workflowComputationMiddleware];
