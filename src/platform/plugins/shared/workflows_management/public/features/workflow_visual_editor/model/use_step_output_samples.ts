/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQueries } from '@kbn/react-query';
import type { JsonValue } from '@kbn/utility-types';
import type {
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
  WorkflowStepExecutionListDto,
} from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import type { TreeRun } from '../../../entities/workflows/store/workflow_detail/types';
import { STEP_EXECUTION_POLL_INTERVAL_MS } from '../../../hooks/polling_constants';

export interface StepSample {
  readonly status: 'running' | 'done' | 'error' | 'none';
  readonly output?: JsonValue;
  readonly errorMessage?: string;
}

export interface StepOutputSamples {
  readonly byStep: Readonly<Record<string, StepSample>>;
  /** True while the newest full-workflow run started from the tree has not finished. */
  readonly isFullRunInProgress: boolean;
}

interface UseStepOutputSamplesParams {
  readonly workflowId: string | undefined;
  /** Steps to resolve a sample for (the expanded step rows). */
  readonly stepNames: readonly string[];
  /** Runs started from the reference tree, newest last. */
  readonly treeRuns: readonly TreeRun[];
}

const NO_SAMPLE: StepSample = { status: 'none' };
const RUNNING_SAMPLE: StepSample = { status: 'running' };
const ERROR_SAMPLE: StepSample = { status: 'error' };

const FAILED_STATUSES: readonly ExecutionStatus[] = [
  ExecutionStatus.FAILED,
  ExecutionStatus.CANCELLED,
  ExecutionStatus.TIMED_OUT,
];

const toSample = ({
  status,
  output,
  error,
}: Pick<WorkflowStepExecutionDto, 'status' | 'output' | 'error'>): StepSample => {
  if (!isTerminalStatus(status)) return RUNNING_SAMPLE;
  if (FAILED_STATUSES.includes(status)) return { status: 'error', errorMessage: error?.message };
  if (status === ExecutionStatus.SKIPPED) return NO_SAMPLE;
  return { status: 'done', output };
};

/** A step inside a loop runs several times; the latest run is the one with the highest index. */
const findLatestStepExecution = (
  stepExecutions: readonly WorkflowStepExecutionDto[],
  stepName: string
): WorkflowStepExecutionDto | undefined =>
  stepExecutions
    .filter((stepExecution) => stepExecution.stepId === stepName)
    .reduce<WorkflowStepExecutionDto | undefined>(
      (latest, current) =>
        !latest || current.globalExecutionIndex > latest.globalExecutionIndex ? current : latest,
      undefined
    );

/** What a tree run says about a step, or undefined when the run has nothing (yet) for it. */
const resolveFromTreeRun = (
  run: TreeRun,
  { data: execution, isError }: Pick<UseQueryResult<WorkflowExecutionDto>, 'data' | 'isError'>,
  stepName: string
): StepSample | undefined => {
  const isOwnRun = run.stepId === stepName;
  if (!execution) {
    // The run exists but has not loaded yet: its own step is on its way.
    if (!isOwnRun) return undefined;
    return isError ? ERROR_SAMPLE : RUNNING_SAMPLE;
  }
  const stepExecution = findLatestStepExecution(execution.stepExecutions, stepName);
  if (stepExecution) return toSample(stepExecution);
  return isOwnRun && !isTerminalStatus(execution.status) ? RUNNING_SAMPLE : undefined;
};

/**
 * Resolves the most recent output of each requested step. Runs started from the
 * reference tree win (newest first, and only those that include the step), then
 * the step's newest run from the workflow history.
 */
export const useStepOutputSamples = ({
  workflowId,
  stepNames,
  treeRuns,
}: UseStepOutputSamplesParams): StepOutputSamples => {
  const api = useWorkflowsApi();

  const runQueries = useQueries({
    queries: treeRuns.map((run) => ({
      queryKey: ['workflowExecution', run.executionId, 'treeRun'],
      queryFn: () => api.getExecution(run.executionId, { includeOutput: true }),
      refetchInterval: (data: WorkflowExecutionDto | undefined) =>
        data && isTerminalStatus(data.status) ? false : STEP_EXECUTION_POLL_INTERVAL_MS,
    })),
  });

  const historyQueries = useQueries({
    queries: stepNames.map((stepName) => ({
      queryKey: ['workflows', workflowId, 'step-executions', stepName, 'latest-output'],
      queryFn: () =>
        api.getWorkflowStepExecutions(workflowId ?? '', {
          stepId: stepName,
          size: 1,
          includeOutput: true,
        }),
      enabled: Boolean(workflowId),
      refetchInterval: (data: WorkflowStepExecutionListDto | undefined) => {
        const latest = data?.results[0];
        return latest && !isTerminalStatus(latest.status) ? STEP_EXECUTION_POLL_INTERVAL_MS : false;
      },
    })),
  });

  const resolveStep = (stepName: string, historyIndex: number): StepSample => {
    for (let index = treeRuns.length - 1; index >= 0; index--) {
      const run = treeRuns[index];
      const isRelevant = run.stepId === undefined || run.stepId === stepName;
      const sample = isRelevant ? resolveFromTreeRun(run, runQueries[index], stepName) : undefined;
      if (sample) return sample;
    }

    const latestFromHistory = historyQueries[historyIndex].data?.results[0];
    return latestFromHistory ? toSample(latestFromHistory) : NO_SAMPLE;
  };

  const byStep: Record<string, StepSample> = {};
  stepNames.forEach((stepName, historyIndex) => {
    byStep[stepName] = resolveStep(stepName, historyIndex);
  });

  const newestFullRunIndex = treeRuns.findLastIndex((run) => run.stepId === undefined);
  const newestFullRun = newestFullRunIndex >= 0 ? runQueries[newestFullRunIndex] : undefined;
  const isFullRunInProgress = Boolean(
    newestFullRun &&
      !newestFullRun.isError &&
      (!newestFullRun.data || !isTerminalStatus(newestFullRun.data.status))
  );

  return { byStep, isFullRunInProgress };
};
