/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configureStore } from '@reduxjs/toolkit';
import { workflowComputationMiddleware } from './middleware';
import { ignoredActions, ignoredPaths, workflowDetailReducer } from './slice';
import type { WorkflowsServices } from '../../../../types';

// Store factory
export const createWorkflowDetailStore = (services: WorkflowsServices) => {
  return configureStore({
    reducer: {
      detail: workflowDetailReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: { services } },
        serializableCheck: {
          // Ignore these non-serializable fields in the state
          ignoredPaths,
          // Ignore these specific action types that contain non-serializable data
          ignoredActions,
        },
      }).concat(workflowComputationMiddleware),
  });
};

export type AppDispatch = ReturnType<typeof createWorkflowDetailStore>['dispatch'];
