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
  UpdatedWorkflowResponseDto,
} from '@kbn/workflows';
import { WorkflowsService } from './workflows_management_service';
import { SchedulerService } from '../scheduler/scheduler_service';

export interface GetWorkflowsParams {
  triggerType?: 'schedule' | 'event';
  limit: number;
  offset: number;
  _full?: boolean;
}

export interface GetWorkflowExecutionLogsParams {
  executionId: string;
  limit?: number;
  offset?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WorkflowExecutionLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'debug' | 'warn' | 'error';
  message: string;
  stepId?: string;
  stepName?: string;
  connectorType?: string;
  duration?: number;
  additionalData?: Record<string, any>;
}

export interface WorkflowExecutionLogsDto {
  logs: WorkflowExecutionLogEntry[];
  total: number;
  limit: number;
  offset: number;
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
  ): Promise<UpdatedWorkflowResponseDto> {
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

  public async getWorkflowExecutionLogs(
    params: GetWorkflowExecutionLogsParams
  ): Promise<WorkflowExecutionLogsDto> {
    const result = await this.workflowsService.getExecutionLogs(params.executionId);

    // Transform the logs to match our API format
    return {
      logs: result.logs.map((log: any) => ({
        id: log.id,
        timestamp: log.source['@timestamp'],
        level: log.source.level,
        message: log.source.message,
        stepId: log.source.workflow?.step_id,
        stepName: log.source.workflow?.step_name,
        connectorType: log.source.workflow?.step_type,
        duration: log.source.duration,
        additionalData: log.source.additionalData,
      })),
      total: typeof result.total === 'number' ? result.total : result.total?.value || 0,
      limit: params.limit || 100,
      offset: params.offset || 0,
    };
  }
}
