/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowListModel, WorkflowModel } from '@kbn/workflows';
import { WorkflowsService } from './workflows_management_service';

export interface GetWorkflowsParams {
  triggerType?: 'schedule' | 'event';
  limit: number;
  offset: number;
  _full?: boolean;
}

export class WorkflowsManagementApi {
  constructor(private readonly workflowsService: WorkflowsService) {}

  public async getWorkflows(params: GetWorkflowsParams): Promise<WorkflowListModel> {
    return await this.workflowsService.searchWorkflows(params);
  }

  public async createWorkflow(workflow: WorkflowModel): Promise<WorkflowModel> {
    return await this.workflowsService.createWorkflow(workflow);
  }

  public async getWorkflow(id: string): Promise<WorkflowModel> {
    return await this.workflowsService.getWorkflow(id);
  }
}
