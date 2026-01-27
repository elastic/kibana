/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowExecutionRepository as WorkflowExecutionRepositoryType } from '../../server/repositories/workflow_execution_repository';

export class WorkflowExecutionRepositoryMock implements Required<WorkflowExecutionRepositoryType> {
  public workflowExecutions = new Map<string, EsWorkflowExecution>();

  public getWorkflowExecutionById(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<EsWorkflowExecution | null> {
    return Promise.resolve(this.workflowExecutions.get(workflowExecutionId) || null);
  }

  public createWorkflowExecution(
    workflowExecution: Partial<EsWorkflowExecution>,
    _options: { refresh?: boolean | 'wait_for' } = {}
  ): Promise<void> {
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

  public async hasRunningExecution(
    workflowId: string,
    spaceId: string,
    triggeredBy?: string
  ): Promise<boolean> {
    let results = Array.from(this.workflowExecutions.values()).filter(
      (exec) =>
        exec.workflowId === workflowId &&
        exec.spaceId === spaceId &&
        !TerminalExecutionStatuses.includes(exec.status)
    );

    if (triggeredBy) {
      results = results.filter((exec) => exec.triggeredBy === triggeredBy);
    }

    // Return true if there's at least one running execution
    return results.length > 0;
  }

  public async getRunningExecutionsByWorkflowId(
    workflowId: string,
    spaceId: string,
    triggeredBy?: string
  ): Promise<Array<{ _source: EsWorkflowExecution; _id: string; _index: string }>> {
    let results = Array.from(this.workflowExecutions.values()).filter(
      (exec) =>
        exec.workflowId === workflowId &&
        exec.spaceId === spaceId &&
        !TerminalExecutionStatuses.includes(exec.status)
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

  public async getRunningExecutionsByConcurrencyGroup(
    concurrencyGroupKey: string,
    spaceId: string,
    excludeExecutionId?: string,
    size: number = 5000
  ): Promise<string[]> {
    const results = Array.from(this.workflowExecutions.values())
      .filter(
        (exec) =>
          exec.concurrencyGroupKey === concurrencyGroupKey &&
          exec.spaceId === spaceId &&
          !TerminalExecutionStatuses.includes(exec.status) &&
          (!excludeExecutionId || exec.id !== excludeExecutionId)
      )
      .sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return aTime - bTime; // Oldest first
      })
      .map((exec) => exec.id)
      .slice(0, Math.min(size, 10000)); // Cap at ES default max_result_window

    return results;
  }

  public async bulkUpdateWorkflowExecutions(
    updates: Array<Partial<EsWorkflowExecution>>
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    // Validate all IDs are present
    for (const update of updates) {
      if (!update.id) {
        throw new Error('Workflow execution ID is required for bulk update');
      }
    }

    // Validate all executions exist (matching Elasticsearch document_missing_exception behavior)
    const missingIds: string[] = [];
    for (const update of updates) {
      if (!this.workflowExecutions.has(update.id!)) {
        missingIds.push(update.id!);
      }
    }

    if (missingIds.length > 0) {
      throw new Error(
        `Failed to update ${missingIds.length} workflow executions: ${JSON.stringify(
          missingIds.map((id) => ({
            id,
            error: { type: 'document_missing_exception', reason: 'document missing' },
            status: 404,
          }))
        )}`
      );
    }

    // Perform updates
    for (const update of updates) {
      const existing = this.workflowExecutions.get(update.id!);
      this.workflowExecutions.set(update.id!, {
        ...existing!,
        ...update,
      } as EsWorkflowExecution);
    }
  }
}
