/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isWorkflowStepTriggered } from './well_known_trigger_sources';

export const WORKFLOW_EXECUTE_STEP_TYPE = 'workflow.execute' as const;
export const WORKFLOW_EXECUTE_ASYNC_STEP_TYPE = 'workflow.executeAsync' as const;

export const isExecuteSyncStepType = (stepType: string | undefined): boolean =>
  stepType === WORKFLOW_EXECUTE_STEP_TYPE;

export const isExecuteAsyncStepType = (stepType: string | undefined): boolean =>
  stepType === WORKFLOW_EXECUTE_ASYNC_STEP_TYPE;

export const isExecuteStepType = (stepType: string | undefined): boolean =>
  isExecuteSyncStepType(stepType) || isExecuteAsyncStepType(stepType);

export type ParentWorkflowInvocation = 'sync' | 'async';

export const isSyncParentInvocation = (
  context: Record<string, unknown> | undefined
): context is Record<string, unknown> & {
  parentWorkflowInvocation: 'sync';
  parentWorkflowExecutionId: string;
} =>
  context?.parentWorkflowInvocation === 'sync' &&
  typeof context?.parentWorkflowExecutionId === 'string';

/**
 * True when a parent workflow step did not start the execution, so it is the root of its own
 * lineage chain. Execution scheduling uses `isWorkflowStepTriggered` directly, so widening what
 * counts as a chain here can't change how runs are scheduled.
 */
export const isTopLevelWorkflowExecution = ({ triggeredBy }: { triggeredBy?: string }): boolean =>
  !isWorkflowStepTriggered(triggeredBy);
