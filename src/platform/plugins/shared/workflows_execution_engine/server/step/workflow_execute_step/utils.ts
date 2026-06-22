/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type agent from 'elastic-apm-node';
import type { EsWorkflow, EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { pickManagedWorkflowFields } from '@kbn/workflows';
import { getCurrentTraceParent } from '../../workflow_context_manager/apm_internal';

export interface ChildWorkflowTraceContext {
  rootTraceId?: string;
  rootEntryTransactionId?: string;
  parentTraceParent?: string;
}

export function buildChildWorkflowTraceContext(
  apm: typeof agent,
  parentExecution: Pick<EsWorkflowExecution, 'traceId' | 'entryTransactionId'>
): ChildWorkflowTraceContext {
  const parentTraceParent = getCurrentTraceParent(apm);

  return {
    ...(parentExecution.traceId ? { rootTraceId: parentExecution.traceId } : {}),
    ...(parentExecution.entryTransactionId
      ? { rootEntryTransactionId: parentExecution.entryTransactionId }
      : {}),
    ...(parentTraceParent ? { parentTraceParent } : {}),
  };
}

export function toExecutionModel(
  workflow: EsWorkflow,
  isTestRun: boolean
): WorkflowExecutionEngineModel {
  return {
    id: workflow.id,
    name: workflow.name,
    enabled: workflow.enabled,
    definition: workflow.definition,
    yaml: workflow.yaml,
    ...pickManagedWorkflowFields(workflow),
    isTestRun,
  };
}
