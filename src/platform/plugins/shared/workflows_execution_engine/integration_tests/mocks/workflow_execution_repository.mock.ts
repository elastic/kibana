/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
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
}
