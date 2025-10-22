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
import { schemaGenerationMiddleware } from './schema_generation_middleware';
import { workflowEditorReducer } from './slice';

// Store factory
export const createWorkflowEditorStore = () => {
  return configureStore({
    reducer: {
      workflow: workflowEditorReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these non-serializable fields in the state
          ignoredPaths: [
            'workflow.computed.yamlDocument',
            'workflow.computed.yamlLineCounter',
            'workflow.computed.workflowGraph',
            'workflow.computed.workflowLookup',
            'workflow.computed.workflowDefinition',
            'workflow.schemaLoose',
          ],
          // Ignore these specific action types that contain non-serializable data
          ignoredActions: [
            'workflow/_setComputedDataInternal',
            'workflow/_setGeneratedSchemaInternal',
          ],
        },
      }).concat(workflowComputationMiddleware, schemaGenerationMiddleware),
  });
};

// Default store
export const workflowEditorStore = createWorkflowEditorStore();
