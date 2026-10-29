/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject } from 'inversify';
import { isMainThread, threadId } from 'node:worker_threads';
import { recordRemoteHeap, remotable } from '@kbn/core-remote-common';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { runWorkflowEngineInWorker } from './assemble_engine_loop';
import {
  type WorkflowExecutorApi,
  type WorkflowLogApi,
  WorkflowLogToken,
  type WorkflowStepCatalogApi,
  WorkflowStepCatalogToken,
  type WorkflowStorageApi,
  WorkflowStorageToken,
} from './tokens';

interface ExecutableStep {
  name?: string;
  type?: string;
  steps?: unknown;
  branches?: unknown;
}

/**
 * Steps that finish inside the current task. `if` and `foreach` are in this set.
 * A `wait` of at least five seconds parks and comes back through the resume task.
 */
const IN_PROCESS_TYPES = new Set(['wait', 'if', 'foreach', 'while', 'switch', 'data.set']);

/**
 * Pauses this proof does not run. They use the same resume entry as a long wait.
 * Parallel also stores branch progress. Human input also sends a message through
 * `executeConnector` and reads `resumeInput`.
 */
const PARKING_TYPES = new Set([
  'parallel',
  'waitForInput',
  'waitForApproval',
  'workflow.execute',
  'workflow.executeAsync',
]);

/**
 * Worker entry for one workflow run. The existing step walker runs here.
 * `CoreStart`, Actions, Task Manager, and Workflows Extensions stay on the coordinator.
 * Making those constructors remotable later means splitting the parts that should run
 * in the worker out of the plugin start contracts. This proof does not do that split.
 */
@remotable()
export class WorkflowExecutor implements WorkflowExecutorApi {
  constructor(
    @inject(WorkflowStepCatalogToken)
    private readonly steps: WorkflowStepCatalogApi,
    @inject(WorkflowStorageToken)
    private readonly storage: WorkflowStorageApi,
    @inject(WorkflowLogToken)
    private readonly log: WorkflowLogApi
  ) {}

  async placement(): Promise<{
    executor: { threadId: number; isMainThread: boolean };
    storage: { threadId: number; isMainThread: boolean };
  }> {
    return {
      executor: { threadId, isMainThread },
      storage: await this.storage.whereAmI(),
    };
  }

  async block(milliseconds: number): Promise<number> {
    const start = Date.now();
    while (Date.now() - start < milliseconds) {
      // Occupies this thread only. The coordinator keeps running.
    }
    return Date.now() - start;
  }

  async run(request: {
    scopeId: string;
    workflowRunId: string;
    spaceId: string;
  }): Promise<{ status: string }> {
    const execution = await this.storage.getExecution(
      request.scopeId,
      request.workflowRunId,
      request.spaceId
    );
    if (isTerminalStatus(execution.status)) {
      return { status: execution.status };
    }

    try {
      this.assertRunnable(execution.workflowDefinition);
      const resume =
        execution.status === ExecutionStatus.WAITING ||
        execution.status === ExecutionStatus.WAITING_FOR_INPUT ||
        (execution.status === ExecutionStatus.RUNNING && Boolean(execution.currentNodeId));
      const status = await runWorkflowEngineInWorker({
        execution,
        scopeId: request.scopeId,
        steps: this.steps,
        storage: this.storage,
        log: this.log,
        resume,
      });
      recordRemoteHeap('REMOTE_WORKER_HEAP', status);
      return { status };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.storage.complete(request.scopeId, {
        id: execution.id,
        status: ExecutionStatus.FAILED,
        error: { type: 'RemoteExecutionError', message },
        startedAt: execution.startedAt,
      });
      recordRemoteHeap('REMOTE_WORKER_HEAP', 'failed');
      throw error;
    }
  }

  private assertRunnable(definition: { steps?: ExecutableStep[] } | undefined): void {
    for (const step of walkSteps(definition?.steps)) {
      const stepName = step.name ?? step.type ?? 'step';
      if (!step.type) {
        throw new Error(`Remote step "${stepName}" is missing a type`);
      }
      if (PARKING_TYPES.has(step.type)) {
        throw new Error(
          `Unsupported remote step type "${step.type}". Parallel, human input, polling, and child workflows are not run in this remote proof.`
        );
      }
      if (!IN_PROCESS_TYPES.has(step.type) && !this.steps.supports(step.type)) {
        throw new Error(
          `Unsupported remote step type "${step.type}". Experimental remote execution only runs steps registered for this anchor.`
        );
      }
    }
  }
}

function walkSteps(steps: unknown): ExecutableStep[] {
  if (!Array.isArray(steps)) {
    return [];
  }
  const found: ExecutableStep[] = [];
  for (const step of steps) {
    if (step && typeof step === 'object') {
      const record = step as ExecutableStep;
      found.push(record);
      found.push(...walkSteps(record.steps));
      if (Array.isArray(record.branches)) {
        for (const branch of record.branches) {
          if (branch && typeof branch === 'object') {
            found.push(...walkSteps((branch as { steps?: unknown }).steps));
          }
        }
      }
    }
  }
  return found;
}
