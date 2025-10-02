/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
// Re-export everything from the individual modules
export type { WorkflowEditorState, RootState, AppDispatch, WorkflowEditorStore } from './types';

// Action creators
export { setYamlString, clearComputedData, setCursorPosition, setStepExecutions } from './slice';

// Store
export { createWorkflowEditorStore, workflowEditorStore } from './store';

// Selectors
export {
  selectYamlString,
  selectYamlDocument,
  selectWorkflowLookup,
  selectWorkflowGraph,
  selectFocusedStepInfo,
  selectStepExecutions,
  selectHighlightedStepId,
} from './selectors';

// Middleware (if needed for custom store setup)
export { workflowComputationMiddleware } from './middleware';
export type { WorkflowLookup, StepInfo } from './utils/build_workflow_lookup';
export { WorkflowEditorStoreProvider } from './provider';
