/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const WORKFLOW_EXECUTE_STEP_TYPE: 'workflow.execute';
export declare const WORKFLOW_EXECUTE_ASYNC_STEP_TYPE: 'workflow.executeAsync';
export declare const isExecuteSyncStepType: (stepType: string | undefined) => boolean;
export declare const isExecuteAsyncStepType: (stepType: string | undefined) => boolean;
export declare const isExecuteStepType: (stepType: string | undefined) => boolean;
export type ParentWorkflowInvocation = 'sync' | 'async';
export declare const isSyncParentInvocation: (
  context: Record<string, unknown> | undefined
) => context is Record<string, unknown> & {
  parentWorkflowInvocation: 'sync';
  parentWorkflowExecutionId: string;
};
