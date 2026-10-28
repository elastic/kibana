/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject } from 'inversify';
import { randomUUID } from 'node:crypto';
import { isMainThread, threadId } from 'node:worker_threads';
import { remotable } from '@kbn/core-remote-common';
import { type EsWorkflowStepExecution, ExecutionStatus } from '@kbn/workflows';
import {
  type WorkflowExecutorApi,
  type WorkflowLogApi,
  WorkflowLogToken,
  type WorkflowStepCatalogApi,
  WorkflowStepCatalogToken,
  type WorkflowStorageApi,
  WorkflowStorageToken,
} from './tokens';
import { WorkflowTemplatingEngine } from '../templating_engine';
import { buildWorkflowRenderContext } from '../workflow_context_manager/build_workflow_context';

interface RemoteStepContext {
  readonly attribution?: {
    readonly type: string;
    readonly id: string;
    readonly name: string;
    readonly runId: string;
  };
}

interface ExecutableStep {
  name?: string;
  type?: string;
  with?: unknown;
  config?: unknown;
  steps?: unknown;
  foreach?: unknown;
  branches?: unknown;
}

const NESTED_KEYS = ['steps', 'foreach', 'branches'] as const;

/**
 * Sequential anchor runner. Graph rendering and step dispatch happen here.
 * Persistence, Cases, and Elasticsearch stay behind injected capabilities.
 * Resume, loops, and steps that are not in the catalogue are explicitly unsupported.
 */
@remotable()
export class WorkflowExecutor implements WorkflowExecutorApi {
  private readonly templating = new WorkflowTemplatingEngine();

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
    const steps = ((execution.workflowDefinition as { steps?: ExecutableStep[] }).steps ??
      []) as ExecutableStep[];
    await this.log.info(
      `Remote workflow ${execution.workflowId} execution ${execution.id} starting with ${steps.length} steps`
    );
    const stepOutputs: Record<string, { output: unknown }> = {};
    const context: RemoteStepContext = {
      attribution: {
        type: 'workflow',
        id: execution.workflowId,
        name: execution.workflowDefinition?.name ?? '',
        runId: execution.id,
      },
    };

    try {
      // Reject the whole run before persistence or step side effects. Do not fall back to the
      // coordinator engine: an unmigrated step is explicitly unsupported in remote mode.
      this.assertRunnable(steps);
      await this.storage.markRunning(request.scopeId, execution.id, request.spaceId);

      for (const [index, step] of steps.entries()) {
        const stepName = step.name ?? step.type ?? `step_${index}`;
        const stepType = step.type;
        if (!stepType) {
          throw new Error(`Remote step "${stepName}" is missing a type`);
        }
        const renderContext = {
          ...buildWorkflowRenderContext(execution),
          steps: stepOutputs,
        };
        const input = {
          with: this.templating.render(step.with ?? {}, renderContext),
          config: this.templating.render(step.config ?? {}, renderContext),
        };
        const startedAt = new Date();
        const result = await this.steps.run(stepType, request.scopeId, input, context);
        const output = unwrapOutput(result);
        const finishedAt = new Date();
        stepOutputs[stepName] = { output };
        await this.storage.recordStep(
          request.scopeId,
          stepRecord({
            execution,
            stepName,
            stepType,
            index,
            startedAt,
            finishedAt,
            input,
            output,
            status: ExecutionStatus.COMPLETED,
          })
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.storage.complete(request.scopeId, {
        id: execution.id,
        status: ExecutionStatus.FAILED,
        error: { type: 'RemoteExecutionError', message },
        startedAt: execution.startedAt,
      });
      throw error;
    }

    await this.storage.complete(request.scopeId, {
      id: execution.id,
      status: ExecutionStatus.COMPLETED,
      startedAt: execution.startedAt,
    });
    return { status: ExecutionStatus.COMPLETED };
  }

  private assertRunnable(steps: readonly ExecutableStep[]): void {
    for (const [index, step] of steps.entries()) {
      const stepName = step.name ?? step.type ?? `step_${index}`;
      for (const key of NESTED_KEYS) {
        if (step[key] != null) {
          throw new Error(
            `Unsupported remote step shape "${key}" on "${stepName}". Loops and branches are not run remotely.`
          );
        }
      }
      if (!step.type) {
        throw new Error(`Remote step "${stepName}" is missing a type`);
      }
      if (!this.steps.supports(step.type)) {
        throw new Error(
          `Unsupported remote step type "${step.type}". Experimental remote execution only runs steps registered for this anchor.`
        );
      }
    }
  }
}

function unwrapOutput(result: unknown): unknown {
  if (result && typeof result === 'object' && 'output' in result) {
    return (result as { output: unknown }).output;
  }
  return result;
}

function stepRecord({
  execution,
  stepName,
  stepType,
  index,
  startedAt,
  finishedAt,
  input,
  output,
  status,
}: {
  execution: { id: string; workflowId: string; spaceId: string; isTestRun?: boolean };
  stepName: string;
  stepType: string;
  index: number;
  startedAt: Date;
  finishedAt: Date;
  input: unknown;
  output: unknown;
  status: EsWorkflowStepExecution['status'];
}): EsWorkflowStepExecution {
  return {
    id: randomUUID(),
    spaceId: execution.spaceId,
    stepId: stepName,
    stepType,
    scopeStack: [],
    workflowRunId: execution.id,
    workflowId: execution.workflowId,
    status,
    isTestRun: execution.isTestRun,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    executionTimeMs: finishedAt.getTime() - startedAt.getTime(),
    topologicalIndex: index,
    globalExecutionIndex: index,
    stepExecutionIndex: 0,
    input: input as EsWorkflowStepExecution['input'],
    output: output as EsWorkflowStepExecution['output'],
  };
}
