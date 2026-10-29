/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMainThread, threadId } from 'node:worker_threads';
import { remotable } from '@kbn/core-remote-common';
import type { Logger } from '@kbn/logging';
import {
  type EsWorkflowExecution,
  type EsWorkflowStepExecution,
  ExecutionStatus,
} from '@kbn/workflows';
import type { WorkflowStorageApi, WorkflowThreadIdentity } from './tokens';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/**
 * Coordinator-side persistence. The executor decides transitions; this class performs the
 * existing repository reads and writes. It is not loaded in the worker.
 */
@remotable()
export class WorkflowStorage implements WorkflowStorageApi {
  constructor(
    private readonly workflowExecutionRepository: WorkflowExecutionRepository,
    private readonly stepExecutionRepository: StepExecutionRepository,
    private readonly logger: Logger
  ) {}

  whereAmI(): WorkflowThreadIdentity {
    return { threadId, isMainThread };
  }

  async getExecution(
    _scopeId: string,
    workflowRunId: string,
    spaceId: string
  ): Promise<EsWorkflowExecution> {
    const execution = await this.workflowExecutionRepository.getWorkflowExecutionById(
      workflowRunId,
      spaceId
    );
    if (!execution) {
      throw new Error(`Workflow execution ${workflowRunId} was not found`);
    }
    return execution;
  }

  async markRunning(_scopeId: string, workflowRunId: string, _spaceId: string): Promise<void> {
    await this.workflowExecutionRepository.updateWorkflowExecution({
      id: workflowRunId,
      status: ExecutionStatus.RUNNING,
    });
  }

  async recordStep(_scopeId: string, step: EsWorkflowStepExecution): Promise<void> {
    await this.stepExecutionRepository.bulkUpsert([step]);
  }

  async complete(
    _scopeId: string,
    update: {
      id: string;
      status: EsWorkflowExecution['status'];
      error?: EsWorkflowExecution['error'];
      startedAt?: string;
    }
  ): Promise<void> {
    const finishedAt = new Date();
    const startedAt = update.startedAt
      ? new Date(update.startedAt).getTime()
      : finishedAt.getTime();
    await this.workflowExecutionRepository.updateWorkflowExecution(
      {
        id: update.id,
        status: update.status,
        error: update.error,
        finishedAt: finishedAt.toISOString(),
        duration: Math.max(0, finishedAt.getTime() - startedAt),
      },
      { refresh: 'wait_for' }
    );
    this.logger.debug(`Remote workflow execution ${update.id} stored as ${update.status}`);
  }
}
