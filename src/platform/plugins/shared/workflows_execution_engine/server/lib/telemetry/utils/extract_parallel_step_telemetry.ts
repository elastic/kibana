/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_PARALLEL_CONCURRENCY, getStepByNameFromNestedSteps } from '@kbn/workflows';
import type { EsWorkflowExecution, EsWorkflowStepExecution, WorkflowYaml } from '@kbn/workflows';
import type { ParallelStepExecutedParams } from '../events/workflows_execution/types';

const PARALLEL_STEP_TYPE = 'parallel';

type ParallelTelemetry = Omit<ParallelStepExecutedParams, 'eventName' | 'rejectionRate'>;

interface ParallelOutput {
  total?: number;
  succeeded?: number;
  failed?: number;
  results?: Array<{ status?: string }>;
  status?: string;
}

interface ParallelConfig {
  concurrency?: number | { max?: number; 'count-waiting'?: boolean };
  mode?: string;
  timeout?: string;
  'branch-timeout'?: string;
}

const countByStatus = (results: Array<{ status?: string }> | undefined, status: string): number =>
  (results ?? []).filter((r) => r.status === status).length;

const resolveConcurrency = (
  config: ParallelConfig | undefined
): { concurrency: number; countWaiting: boolean; hasExplicit: boolean } => {
  const value = config?.concurrency;
  if (value == null) {
    return { concurrency: DEFAULT_PARALLEL_CONCURRENCY, countWaiting: true, hasExplicit: false };
  }
  if (typeof value === 'number') {
    return { concurrency: value, countWaiting: true, hasExplicit: true };
  }
  return {
    concurrency: value.max ?? DEFAULT_PARALLEL_CONCURRENCY,
    countWaiting: value['count-waiting'] ?? true,
    hasExplicit: true,
  };
};

/**
 * Finds the `parallel` step configuration in the workflow definition by step id.
 * Returns undefined when the definition is unavailable or the step is not found.
 * Delegates the nested-step walk to the shared `getStepByNameFromNestedSteps`, so
 * parallel steps nested under any construct (static `branches`, switch cases,
 * merge, loops, if/else) are resolved consistently with the rest of the engine.
 */
const findParallelConfig = (
  workflowExecution: EsWorkflowExecution,
  stepId: string
): ParallelConfig | undefined => {
  const steps = workflowExecution.workflowDefinition?.steps as WorkflowYaml['steps'] | undefined;
  if (!steps) {
    return undefined;
  }

  const step = getStepByNameFromNestedSteps(steps, stepId);
  if (step?.type !== PARALLEL_STEP_TYPE) {
    return undefined;
  }
  return step as ParallelConfig;
};

/**
 * Derives one telemetry payload per terminated `parallel` step from the step
 * executions of a finished workflow. Reads the aggregate output the parallel
 * node wrote on finish, falling back to per-branch result statuses.
 */
export function extractParallelStepTelemetry(
  workflowExecution: EsWorkflowExecution,
  stepExecutions: EsWorkflowStepExecution[]
): ParallelTelemetry[] {
  const results: ParallelTelemetry[] = [];

  for (const stepExecution of stepExecutions) {
    if (stepExecution.stepType !== PARALLEL_STEP_TYPE) {
      continue; // eslint-disable-line no-continue
    }

    const output = (stepExecution.output ?? {}) as ParallelOutput;
    const branchResults = output.results;
    const total = output.total ?? branchResults?.length ?? 0;
    const succeeded = output.succeeded ?? countByStatus(branchResults, 'completed');
    const failed = output.failed ?? countByStatus(branchResults, 'failed');
    const skipped = countByStatus(branchResults, 'skipped');
    const timedOut = countByStatus(branchResults, 'timed_out');
    const status = output.status === 'failed' ? 'failed' : 'completed';

    const config = findParallelConfig(workflowExecution, stepExecution.stepId);
    const { concurrency, countWaiting, hasExplicit } = resolveConcurrency(config);

    results.push({
      workflowId: workflowExecution.workflowId,
      spaceId: workflowExecution.spaceId,
      stepId: stepExecution.stepId,
      isTestRun: workflowExecution.isTestRun || false,
      total,
      succeeded,
      failed,
      skipped,
      timedOut,
      status,
      concurrency,
      countWaiting,
      mode: config?.mode === 'settled' ? 'settled' : 'fail-fast',
      hasExplicitConcurrency: hasExplicit,
      hasTimeout: Boolean(config?.timeout),
      hasBranchTimeout: Boolean(config?.['branch-timeout']),
    });
  }

  return results;
}
