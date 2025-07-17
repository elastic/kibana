/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CreateWorkflowCommand,
  WorkflowListDto,
  WorkflowExecutionDto,
  WorkflowExecutionListDto,
  WorkflowDetailDto,
  EsWorkflow,
  WorkflowExecutionEngineModel,
  transformWorkflowYamlJsontoEsWorkflow,
} from '@kbn/workflows';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../common';
import { WorkflowsService } from './workflows_management_service';
import { SchedulerService } from '../scheduler/scheduler_service';
import { parseWorkflowYamlToJSON } from '../../common/lib/yaml-utils';

export interface GetWorkflowsParams {
  triggerType?: 'schedule' | 'event';
  limit: number;
  offset: number;
  _full?: boolean;
}

export class WorkflowsManagementApi {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private schedulerService: SchedulerService | null = null
  ) {}

  public setSchedulerService(schedulerService: SchedulerService) {
    this.schedulerService = schedulerService;
  }

  public async getWorkflows(params: GetWorkflowsParams): Promise<WorkflowListDto> {
    return await this.workflowsService.searchWorkflows(params);
  }

  public async getWorkflow(id: string): Promise<WorkflowDetailDto | null> {
    return await this.workflowsService.getWorkflow(id);
  }

  public async createWorkflow(workflow: CreateWorkflowCommand): Promise<WorkflowDetailDto> {
    return await this.workflowsService.createWorkflow(workflow);
  }

  public async updateWorkflow(
    id: string,
    workflow: Partial<EsWorkflow>
  ): Promise<WorkflowDetailDto> {
    return await this.workflowsService.updateWorkflow(id, workflow);
  }

  public async deleteWorkflows(workflowIds: string[]): Promise<void> {
    return await this.workflowsService.deleteWorkflows(workflowIds);
  }

  public async runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    inputs: Record<string, any>
  ): Promise<string> {
    if (!this.schedulerService) {
      throw new Error('Scheduler service not set');
    }
    return await this.schedulerService.runWorkflow(workflow, inputs);
  }

  public async testWorkflow(workflowYaml: string, inputs: Record<string, any>): Promise<string> {
    if (!this.schedulerService) {
      throw new Error('Scheduler service not set');
    }
    const parsedYaml = parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
    const updatedWorkflow = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data);
    return await this.schedulerService.runWorkflow(updatedWorkflow, inputs);
  }

  public async getWorkflowExecutions(workflowId: string): Promise<WorkflowExecutionListDto> {
    return await this.workflowsService.searchWorkflowExecutions({
      workflowId,
    });
  }

  public async getWorkflowExecution(
    workflowExecutionId: string
  ): Promise<WorkflowExecutionDto | null> {
    return await this.workflowsService.getWorkflowExecution(workflowExecutionId);
  }
}
