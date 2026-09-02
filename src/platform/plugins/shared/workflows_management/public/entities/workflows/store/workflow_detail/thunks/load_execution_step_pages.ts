/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowStepExecutionDto, WorkflowStepExecutionListDto } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';

/** Page size used after the first load so completed prefixes can be skipped. */
export const WORKFLOW_EXECUTION_STEPS_POLL_PAGE_SIZE = 100;

export type FetchExecutionStepsPage = (
  page: number,
  size: number
) => Promise<WorkflowStepExecutionListDto>;

export interface LoadExecutionStepPagesParams {
  fetchPage: FetchExecutionStepsPage;
  cachedSteps: WorkflowStepExecutionDto[];
  cachedTotal?: number;
  pollPageSize?: number;
  maxSteps: number;
}

export interface LoadExecutionStepPagesResult {
  steps: WorkflowStepExecutionDto[];
  total: number;
}

const isSkippableTerminalBatch = (batch: WorkflowStepExecutionDto[], pageSize: number): boolean => {
  return batch.length === pageSize && batch.every((step) => isTerminalStatus(step.status));
};

/**
 * Loads step executions up to `maxSteps`. The first load (empty cache) fetches
 * one page of `maxSteps`. Later polls walk `pollPageSize` batches and skip any
 * full batch whose steps are already terminal.
 */
export const loadExecutionStepPages = async ({
  fetchPage,
  cachedSteps,
  cachedTotal = 0,
  pollPageSize = WORKFLOW_EXECUTION_STEPS_POLL_PAGE_SIZE,
  maxSteps,
}: LoadExecutionStepPagesParams): Promise<LoadExecutionStepPagesResult> => {
  if (cachedSteps.length === 0) {
    const result = await fetchPage(1, maxSteps);
    return {
      steps: result.results.slice(0, maxSteps),
      total: result.total,
    };
  }

  let steps = cachedSteps.slice(0, maxSteps);
  let total = Math.max(cachedTotal, cachedSteps.length);
  const maxPages = Math.ceil(maxSteps / pollPageSize);

  for (let page = 1; page <= maxPages; page++) {
    const start = (page - 1) * pollPageSize;
    if (start >= maxSteps) {
      break;
    }

    const batch = steps.slice(start, start + pollPageSize);
    if (!isSkippableTerminalBatch(batch, pollPageSize)) {
      const result = await fetchPage(page, pollPageSize);
      total = result.total;
      const room = maxSteps - start;
      const next = result.results.slice(0, Math.min(pollPageSize, room));
      const reachedEnd =
        next.length < pollPageSize ||
        start + next.length >= total ||
        start + next.length >= maxSteps;

      steps = reachedEnd
        ? [...steps.slice(0, start), ...next]
        : [...steps.slice(0, start), ...next, ...steps.slice(start + pollPageSize)];

      if (reachedEnd) {
        break;
      }
    }
  }

  return { steps: steps.slice(0, maxSteps), total };
};
