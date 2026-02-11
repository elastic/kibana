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
  normalizeInputsToJsonSchema,
} from '@kbn/workflows/spec/lib/input_conversion';
import type { ContextDependencies } from './types';
import { buildWorkflowExecutionUrl, getKibanaUrl } from '../utils';

export function buildWorkflowContext(
  workflowExecution: EsWorkflowExecution,
  coreStart?: CoreStart,
  dependencies?: ContextDependencies
): WorkflowContext {
  const kibanaUrl = getKibanaUrl(coreStart, dependencies?.cloudSetup);
  const executionUrl = buildWorkflowExecutionUrl(
    kibanaUrl,
    workflowExecution.spaceId,
    workflowExecution.workflowId,
    workflowExecution.id
  );
  const normalizedInputsSchema = normalizeInputsToJsonSchema(
    workflowExecution.workflowDefinition.inputs
  );
  const inputsWithDefaults = applyInputDefaults(
    workflowExecution.context?.inputs as Record<string, unknown> | undefined,
    normalizedInputsSchema
  );

  return {
    execution: {
      id: workflowExecution.id,
      isTestRun: !!workflowExecution.isTestRun,
      startedAt: new Date(workflowExecution.startedAt),
      url: executionUrl,
      executedBy: workflowExecution.executedBy ?? 'unknown',
      triggeredBy: workflowExecution.triggeredBy,
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
