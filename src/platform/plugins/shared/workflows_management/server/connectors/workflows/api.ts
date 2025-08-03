/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExternalServiceApiHandlerArgs, WorkflowsExecutorResultData } from './types';

const run = async ({
  externalService,
  params,
}: ExternalServiceApiHandlerArgs): Promise<WorkflowsExecutorResultData> => {
  const { workflowId, inputs } = params;
  const res = await externalService.runWorkflow({ workflowId, inputs });
  return { workflowRunId: res.workflowRunId, status: res.status };
};

export const api = {
  run,
} as const;
