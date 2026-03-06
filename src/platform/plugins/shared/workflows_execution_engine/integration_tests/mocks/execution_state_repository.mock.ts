/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EsExecution,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  ExecutionStatus,
} from '@kbn/workflows';

export class ExecutionStateRepositoryMock {
  public workflowExecutions = new Map<string, EsWorkflowExecution>();
  public stepExecutions = new Map<string, EsWorkflowStepExecution>();

  public async getWorkflowExecutions(
    ids: Set<string>,
    spaceId: string
  ): Promise<Record<string, EsWorkflowExecution>> {
    const result: Record<string, EsWorkflowExecution> = {};
    for (const id of ids) {
      const exec = this.workflowExecutions.get(id);
      if (exec && exec.spaceId === spaceId) {
        result[id] = exec;
      }
    }
    return result;
  }

  public async getStepExecutions(
    ids: Set<string>,
    spaceId: string
  ): Promise<Record<string, EsWorkflowStepExecution>> {
    const result: Record<string, EsWorkflowStepExecution> = {};
    for (const id of ids) {
      const exec = this.stepExecutions.get(id);
      if (exec && exec.spaceId === spaceId) {
        result[id] = exec;
      }
    }
    return result;
  }

  public async bulkCreate(executions: Array<Partial<EsExecution>>): Promise<void> {
    this.writeExecutions(executions);
  }

  public async bulkUpsert(executions: Array<Partial<EsExecution>>): Promise<void> {
    this.writeExecutions(executions);
  }

  public async bulkUpdate(executions: Array<Partial<EsExecution>>): Promise<void> {
    this.writeExecutions(executions);
  }

  public async searchWorkflowExecutions<K extends keyof EsWorkflowExecution>(params: {
    filter: {
      spaceId: string;
      workflowId?: string;
      triggeredBy?: string;
      statuses?: ExecutionStatus[];
      concurrencyGroupKey?: string;
    };
    pagination: { size: number; from: number };
    fields?: K[];
  }): Promise<{ results: Array<Pick<EsWorkflowExecution, K>>; total: number }> {
    // no-op stub
    return {
      results: [],
      total: 0,
    };
  }

  public async deleteTerminalExecutions(_olderThan: Date): Promise<void> {
    // no-op stub
  }

  private writeExecutions(executions: Array<Partial<EsExecution>>): void {
    for (const execution of executions) {
      if (!execution.id) {
        throw new Error('Execution ID is required');
      }

      if (execution.type === 'workflow') {
        const existing = this.workflowExecutions.get(execution.id);
        this.workflowExecutions.set(execution.id, {
          ...(existing || {}),
          ...execution,
        } as EsWorkflowExecution);
      } else if (execution.type === 'step') {
        const existing = this.stepExecutions.get(execution.id);
        this.stepExecutions.set(execution.id, {
          ...(existing || {}),
          ...execution,
        } as EsWorkflowStepExecution);
      }
    }
  }
}
