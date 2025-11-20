/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionRepository as WorkflowExecutionRepositoryType } from '../../server/repositories/workflow_execution_repository';

export class WorkflowExecutionRepositoryMock implements Required<WorkflowExecutionRepositoryType> {
  public workflowExecutions = new Map<string, EsWorkflowExecution>();

  public getWorkflowExecutionById(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<EsWorkflowExecution | null> {
    return Promise.resolve(this.workflowExecutions.get(workflowExecutionId) || null);
  }

  public createWorkflowExecution(workflowExecution: Partial<EsWorkflowExecution>): Promise<void> {
    if (!workflowExecution.id) {
      throw new Error('Workflow execution ID is required for creation');
    }

    this.workflowExecutions.set(workflowExecution.id, workflowExecution as EsWorkflowExecution);
    return Promise.resolve();
  }

  public updateWorkflowExecution(workflowExecution: Partial<EsWorkflowExecution>): Promise<void> {
    if (!workflowExecution.id) {
      throw new Error('Workflow execution ID is required for update');
    }

    if (!this.workflowExecutions.has(workflowExecution.id)) {
      throw new Error(`Workflow execution with ID ${workflowExecution.id} does not exist`);
    }

    this.workflowExecutions.set(workflowExecution.id, {
      ...this.workflowExecutions.get(workflowExecution.id),
      ...(workflowExecution as EsWorkflowExecution),
    });
    return Promise.resolve();
  }

  public async searchWorkflowExecutions(
    query: Record<string, unknown>,
    size: number = 10
  ): Promise<Array<{ _source: EsWorkflowExecution; _id: string; _index: string }>> {
    let results = Array.from(this.workflowExecutions.values());

    // Simple query parser for bool queries with term filters
    if (query.bool && typeof query.bool === 'object') {
      const boolQuery = query.bool as {
        must?: Array<{ term?: Record<string, unknown> }>;
        must_not?: Array<{ terms?: Record<string, unknown[]> }>;
      };

      // Apply must clauses (term filters)
      if (boolQuery.must) {
        for (const clause of boolQuery.must) {
          if (clause.term) {
            for (const [field, value] of Object.entries(clause.term)) {
              results = results.filter(
                (exec) => (exec as unknown as Record<string, unknown>)[field] === value
              );
            }
          }
        }
      }

      // Apply must_not clauses (exclusions)
      if (boolQuery.must_not) {
        for (const clause of boolQuery.must_not) {
          if (clause.terms) {
            for (const [field, values] of Object.entries(clause.terms)) {
              results = results.filter(
                (exec) => !values.includes((exec as unknown as Record<string, unknown>)[field])
              );
            }
          }
        }
      }
    }

    // Apply size limit
    results = results.slice(0, size);

    // Return in Elasticsearch hit format
    return results.map((exec) => ({
      _source: exec,
      _id: exec.id,
      _index: 'workflows-executions',
    }));
  }

  public async getRunningExecutionsByWorkflowId(
    workflowId: string,
    spaceId: string,
    triggeredBy?: string
  ): Promise<Array<{ _source: EsWorkflowExecution; _id: string; _index: string }>> {
    const terminalStatuses = [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.FAILED,
      ExecutionStatus.CANCELLED,
      ExecutionStatus.SKIPPED,
      ExecutionStatus.TIMED_OUT,
    ];

    let results = Array.from(this.workflowExecutions.values()).filter(
      (exec) =>
        exec.workflowId === workflowId &&
        exec.spaceId === spaceId &&
        !terminalStatuses.includes(exec.status)
    );

    if (triggeredBy) {
      results = results.filter((exec) => exec.triggeredBy === triggeredBy);
    }

    // Return in Elasticsearch hit format, limited to 1 as per the real implementation
    return results.slice(0, 1).map((exec) => ({
      _source: exec,
      _id: exec.id,
      _index: 'workflows-executions',
    }));
  }
}
