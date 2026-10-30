/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, ExecutionType, type WorkflowExecutionListDto } from '@kbn/workflows';
import {
  getLastRunStepCommonDefinition,
  type GetLastRunStepOutput,
} from '../../../common/steps/workflow';
import { createServerStepDefinition } from '../../step_registry/types';

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_WINDOW_HOURS = 24;
/** A few, so the run in progress can be skipped if history ever lists it as completed. */
const LAST_RUNS_READ = 3;

interface LastSuccess {
  id: string;
  startedAt: string;
  finishedAt?: string;
}

/** The window a run should process, from the last successful run of its workflow. */
export const resolveLastRunWindow = ({
  lastSuccess,
  now,
  defaultHours = DEFAULT_WINDOW_HOURS,
  maxHours,
}: {
  lastSuccess?: LastSuccess;
  now: Date;
  defaultHours?: number;
  maxHours?: number;
}): GetLastRunStepOutput => {
  const earliest = maxHours !== undefined ? now.getTime() - maxHours * HOUR_MS : -Infinity;
  const start = lastSuccess
    ? new Date(lastSuccess.startedAt).getTime()
    : now.getTime() - defaultHours * HOUR_MS;
  const since = Math.max(start, earliest);
  return {
    first_run: lastSuccess === undefined,
    since: new Date(since).toISOString(),
    hours_since: Math.max(1, Math.ceil((now.getTime() - since) / HOUR_MS)),
    ...(lastSuccess && {
      last_success: {
        execution_id: lastSuccess.id,
        started_at: lastSuccess.startedAt,
        ...(lastSuccess.finishedAt && { finished_at: lastSuccess.finishedAt }),
      },
    }),
  };
};

export const getLastRunStepDefinition = createServerStepDefinition({
  ...getLastRunStepCommonDefinition,
  handler: async (context) => {
    try {
      const { workflow, execution } = context.contextManager.getContext();
      const { body } = await context.contextManager.callKibanaApi<WorkflowExecutionListDto>({
        method: 'GET',
        path: `/api/workflows/workflow/${encodeURIComponent(workflow.id)}/executions`,
        query: {
          statuses: ExecutionStatus.COMPLETED,
          executionTypes: ExecutionType.PRODUCTION,
          sortField: 'finishedAt',
          sortOrder: 'desc',
          size: LAST_RUNS_READ,
          omitStepRuns: true,
        },
      });
      const lastSuccess = body.results.find(({ id }) => id !== execution.id);
      return {
        output: resolveLastRunWindow({
          lastSuccess,
          now: new Date(),
          defaultHours: context.input.default_hours,
          maxHours: context.input.max_hours,
        }),
      };
    } catch (error) {
      return {
        error: new Error(
          `Failed to read the last run: ${error instanceof Error ? error.message : String(error)}`
        ),
      };
    }
  },
});
