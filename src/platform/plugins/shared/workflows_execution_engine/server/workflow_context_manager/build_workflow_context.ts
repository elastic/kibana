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
  normalizeInputsToJsonSchemaAsync,
} from '@kbn/workflows/spec/lib/input_conversion';
import type { ContextDependencies } from './types';
import { buildWorkflowExecutionUrl, getKibanaUrl } from '../utils';

export async function buildWorkflowContext(
  workflowExecution: EsWorkflowExecution,
  coreStart?: CoreStart,
  dependencies?: ContextDependencies
): Promise<WorkflowContext> {
  const kibanaUrl = getKibanaUrl(coreStart, dependencies?.cloudSetup);
  const executionUrl = buildWorkflowExecutionUrl(
    kibanaUrl,
    workflowExecution.spaceId,
    workflowExecution.workflowId,
    workflowExecution.id
  );
  const normalizedInputsSchema = await normalizeInputsToJsonSchemaAsync(
    workflowExecution.workflowDefinition.inputs
  );

  // Only apply defaults if we have a valid schema
  const inputsWithDefaults = normalizedInputsSchema
    ? applyInputDefaults(
        workflowExecution.context?.inputs as Record<string, unknown> | undefined,
        normalizedInputsSchema
      )
    : (workflowExecution.context?.inputs as Record<string, unknown> | undefined);

  return {
    execution: {
      id: workflowExecution.id,
      isTestRun: !!workflowExecution.isTestRun,
      startedAt: new Date(workflowExecution.startedAt),
      url: executionUrl,
    },
    workflow: {
      id: workflowExecution.workflowId,
      name: workflowExecution.workflowDefinition?.name ?? '',
      enabled: workflowExecution.workflowDefinition?.enabled ?? false,
      spaceId: workflowExecution.spaceId,
    },
    kibanaUrl,
    consts: workflowExecution.workflowDefinition?.consts ?? {},
    event: workflowExecution.context?.event,
    inputs: inputsWithDefaults,
    now: new Date(),
  };
}
