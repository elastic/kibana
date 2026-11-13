/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowApi } from '@kbn/workflows-ui';

/**
 * The newest run of a step, with its output. The reference tree and the chip hover both read it,
 * through the same query key and request, so the output (which can be megabytes) is fetched once.
 */
export const stepLatestExecutionKey = (
  workflowId: string | undefined,
  stepName: string | undefined
) => ['workflows', workflowId, 'step-executions', stepName, 'latest-execution'] as const;

export const fetchStepLatestExecution = (
  api: WorkflowApi,
  workflowId: string | undefined,
  stepName: string | undefined
) =>
  api.getWorkflowStepExecutions(workflowId ?? '', {
    stepId: stepName,
    size: 1,
    includeOutput: true,
  });
