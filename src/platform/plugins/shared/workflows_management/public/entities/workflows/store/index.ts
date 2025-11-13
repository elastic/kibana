/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
// Re-export everything from the individual modules

// Types
export type * from './types';
export type * from './workflow_detail/types';
export type * from './workflow_detail/utils/build_workflow_lookup';

// Action creators
export * from './workflow_detail/slice';
// Store
export { createWorkflowsStore as createWorkflowDetailStore } from './store';

// Selectors
export * from './workflow_detail/selectors';

// Middleware (if needed for custom store setup)
export { WorkflowDetailStoreProvider } from './provider';
