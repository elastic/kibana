/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflow, WorkflowRepository } from '@kbn/workflows';

export class WorkflowRepositoryMock implements Partial<WorkflowRepository> {
  public workflows = new Map<string, EsWorkflow>();

  public getWorkflow(workflowId: string, spaceId: string): Promise<EsWorkflow | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return Promise.resolve(null);
    }
    // In real implementation, spaceId is used to filter, but for tests we'll just return if found
    return Promise.resolve(workflow);
  }

  public findWorkflowByName(name: string, spaceId: string): Promise<EsWorkflow | null> {
    for (const workflow of this.workflows.values()) {
      if (workflow.name === name) {
        return Promise.resolve(workflow);
      }
    }
    return Promise.resolve(null);
  }

  public isWorkflowEnabled(workflowId: string, spaceId: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    return Promise.resolve(workflow?.enabled ?? false);
  }
}
