/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import type { ExecutorParamsSchema } from './schema';

export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;
export type WorkflowsActionParamsType = ExecutorParams;

export interface RunWorkflowParams {
  workflowId: string;
  spaceId: string;
  alerts?: any[];
  inputs?: Record<string, unknown>;
  [key: string]: unknown;
}

export type ExecutorSubActionRunParams = RunWorkflowParams;

export interface WorkflowsExecutorResultData {
  workflowRunId: string;
  status: string;
}

export interface WorkflowExecutionResponse {
  workflowRunId: string;
  status: string;
}

export interface ExternalService {
  runWorkflow: (params: RunWorkflowParams) => Promise<WorkflowExecutionResponse>;
}

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionRunParams;
  logger: Logger;
}
