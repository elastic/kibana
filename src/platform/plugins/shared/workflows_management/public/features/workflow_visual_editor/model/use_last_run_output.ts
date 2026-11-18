/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import { ExecutionStatus } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { fetchStepLatestExecution, stepLatestExecutionKey } from './step_latest_execution';

const LAST_RUN_STALE_TIME_MS = 30_000;

/**
 * The output of a step's newest run, fetched once when first asked for. Nothing is returned for a
 * step that never ran, or whose newest run did not complete.
 */
export const useLastRunOutput = (
  workflowId: string | undefined,
  stepName: string | undefined
): { readonly output?: unknown } => {
  const api = useWorkflowsApi();
  const { data } = useQuery({
    queryKey: stepLatestExecutionKey(workflowId, stepName),
    queryFn: () => fetchStepLatestExecution(api, workflowId, stepName),
    enabled: Boolean(workflowId && stepName),
    staleTime: LAST_RUN_STALE_TIME_MS,
  });
  const latest = data?.results[0];
  return latest?.status === ExecutionStatus.COMPLETED ? { output: latest.output } : {};
};
