/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  CreateWorkflowCommand,
  EsWorkflow,
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
  WorkflowExecutionListDto,
  WorkflowListDto,
  WorkflowYaml,
} from '@kbn/workflows';
import { transformWorkflowYamlJsontoEsWorkflow } from '@kbn/workflows';
import { parseWorkflowYamlToJSON } from '../../common/lib/yaml_utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../common/schema';
import type { SchedulerService } from '../scheduler/scheduler_service';
import type { WorkflowsService } from './workflows_management_service';

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

  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    return await this.workflowsService.createWorkflow(workflow, request);
  }

  public async updateWorkflow(
    id: string,
    workflow: Partial<EsWorkflow>,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto> {
    return await this.workflowsService.updateWorkflow(id, workflow, request);
  }

  public async deleteWorkflows(workflowIds: string[], request: KibanaRequest): Promise<void> {
    return await this.workflowsService.deleteWorkflows(workflowIds, request);
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

    if (parsedYaml.error) {
      // TODO: handle error properly
      // It should throw BadRequestError in the API
      throw parsedYaml.error;
    }

    const workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data as WorkflowYaml);

    return await this.schedulerService.runWorkflow(
      {
        id: 'test-workflow',
        name: workflowToCreate.name,
        status: workflowToCreate.status,
        definition: workflowToCreate.definition,
      },
      inputs
    );
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
      logs: result.logs
        .filter((log: any) => log) // Filter out undefined/null logs
        .map((log: any) => ({
          id:
            log.id ||
            `${log['@timestamp']}-${log.workflow?.execution_id}-${
              log.workflow?.step_id || 'workflow'
            }`,
          timestamp: log['@timestamp'],
          level: log.level,
          message: log.message,
          stepId: log.workflow?.step_id,
          stepName: log.workflow?.step_name,
          connectorType: log.workflow?.step_type,
          duration: log.event?.duration,
          additionalData: {
            workflowId: log.workflow?.id,
            workflowName: log.workflow?.name,
            executionId: log.workflow?.execution_id,
            event: log.event,
            tags: log.tags,
            error: log.error,
          },
        })),
      total: result.total,
      limit: params.limit || 100,
      offset: params.offset || 0,
    };
  }
}
