/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Collaborator interfaces the plugin classes implement. Prefer the
// `@kbn/workflows-execution-engine-core/collaborators` subpath in consumers
// that only need types; importing from the barrel is fine in callers that
// will also use other exports from this package.
export type {
  WorkflowLogEvent,
  IWorkflowEventLogger,
  IWorkflowContextManager,
  IStepExecutionRuntime,
  IWorkflowExecutionRuntimeManager,
  INodeImplementation,
  INodeWithErrorCatching,
  IMonitorableNode,
  ICancellableNode,
} from './src/collaborators';
export { isCancellableNode } from './src/collaborators';

export { WorkflowTemplatingEngine } from './src/templating_engine';
export { evaluateCondition } from './src/evaluate_condition';
export { safeEvaluateKql } from './src/safe_evaluate_kql';
export type { SafeEvaluateKqlResult } from './src/safe_evaluate_kql';
