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
  IWorkflowExecutionState,
  IStepExecutionRuntimeFactory,
  ScopeData,
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

// Step-level error types and byte-size helpers used by flow-control nodes.
export {
  DEFAULT_MAX_STEP_SIZE,
  formatBytes,
  parseByteSize,
  safeOutputSize,
  ResponseSizeLimitError,
} from './src/step/errors';

// Flow-control node implementations.
export * from './src/step/flow_control_step';
export * from './src/step/foreach_step';
export * from './src/step/if_step';
export * from './src/step/while_step';
export * from './src/step/switch_step';
export * from './src/step/on_failure/continue_step';
export * from './src/step/on_failure/fallback_step';
export * from './src/step/on_failure/retry_step';
export * from './src/step/timeout_zone_step';
export * from './src/step/workflow_output_step';
