/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowContext } from '@kbn/workflows';
import {
  applyInputDefaults,
  getInputsFromDefinition,
} from '@kbn/workflows/spec/lib/field_conversion';
import type { ContextDependencies } from './types';
import { WorkflowTemplatingEngine } from '../templating_engine';
import { buildWorkflowExecutionUrl, getKibanaUrl } from '../utils';

export function buildInputDefaultRenderContext(
  workflowExecution: Partial<EsWorkflowExecution>,
  coreStart?: CoreStart,
  dependencies?: ContextDependencies
): WorkflowContext {
  const executionId = workflowExecution.id ?? '';
  const workflowId = workflowExecution.workflowId ?? '';
  const spaceId = workflowExecution.spaceId ?? 'default';
  const startedAt =
    workflowExecution.startedAt ?? workflowExecution.createdAt ?? new Date().toISOString();
  const kibanaUrl = getKibanaUrl(coreStart, dependencies?.cloudSetup);
  const executionUrl = buildWorkflowExecutionUrl(kibanaUrl, spaceId, workflowId, executionId);
  const parentWorkflowId = workflowExecution.context?.parentWorkflowId as string | undefined;
  const parentWorkflowExecutionId = workflowExecution.context?.parentWorkflowExecutionId as
    | string
    | undefined;
  const parentDepth = workflowExecution.context?.parentDepth as number | undefined;
  const metadata = (workflowExecution.metadata ??
    (workflowExecution.context?.metadata as Record<string, unknown> | undefined)) as
    | Record<string, unknown>
    | undefined;

  return {
    execution: {
      id: executionId,
      isTestRun: !!workflowExecution.isTestRun,
      startedAt: new Date(startedAt),
      url: executionUrl,
      executedBy: workflowExecution.executedBy ?? 'unknown',
      triggeredBy: workflowExecution.triggeredBy,
    },
    workflow: {
      id: workflowId,
      name: workflowExecution.workflowDefinition?.name ?? '',
      enabled: workflowExecution.workflowDefinition?.enabled ?? false,
      spaceId,
    },
    kibanaUrl,
    consts: workflowExecution.workflowDefinition?.consts ?? {},
    event: workflowExecution.context?.event,
    inputs: workflowExecution.context?.inputs as Record<string, unknown> | undefined,
    output: workflowExecution.context?.output,
    now: new Date(),
    parent:
      parentWorkflowId && parentWorkflowExecutionId
        ? {
            workflowId: parentWorkflowId,
            executionId: parentWorkflowExecutionId,
            depth: parentDepth !== undefined ? parentDepth + 1 : 0,
          }
        : undefined,
    metadata,
  };
}

export function buildWorkflowContext(
  workflowExecution: EsWorkflowExecution,
  coreStart?: CoreStart,
  dependencies?: ContextDependencies
): WorkflowContext {
  const normalizedInputsSchema = getInputsFromDefinition(workflowExecution.workflowDefinition);
  const renderContext = buildInputDefaultRenderContext(workflowExecution, coreStart, dependencies);
  const templateEngine = new WorkflowTemplatingEngine();
  const inputsWithDefaults = applyInputDefaults(
    renderContext.inputs,
    normalizedInputsSchema,
    (value) => templateEngine.render(value, renderContext)
  );

  return {
    ...renderContext,
    inputs: inputsWithDefaults,
  };
}
