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
import { _clearComputedData, _setComputedDataInternal, setYamlString } from './slice';
import type { RootState } from '../types';
import { performComputation } from '../utils/computation';

const COMPUTATION_DEBOUNCE_MS = 500; // 500ms debounce

const compute = (
  yamlString: string | undefined,
  store: MiddlewareAPI<Dispatch<AnyAction>, RootState>
) => {
  const computed = performComputation(yamlString);
  if (computed) {
    store.dispatch(_setComputedDataInternal(computed));
  } else {
    store.dispatch(_clearComputedData());
  }
};

const debouncedCompute = debounce(compute, COMPUTATION_DEBOUNCE_MS);

// Side effects middleware - computes derived data when yamlString changes (debounced)
const workflowComputationMiddleware: Middleware =
  (store: MiddlewareAPI<Dispatch<AnyAction>, RootState>) => (next) => (action) => {
    const result = next(action);

    // Only react to yamlString changes
    if (setYamlString.match(action)) {
      debouncedCompute.cancel();

      const yamlString = action.payload;
      const { computed } = store.getState().detail;

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
    }

    return result;
  };

export const workflowDetailMiddleware: Middleware[] = [workflowComputationMiddleware];
