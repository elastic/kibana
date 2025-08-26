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
  EsWorkflowStepExecution,
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
  WorkflowExecutionListDto,
  WorkflowListDto,
  WorkflowYaml,
} from '@kbn/workflows';
import { transformWorkflowYamlJsontoEsWorkflow } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { parseWorkflowYamlToJSON } from '../../common/lib/yaml_utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../common/schema';
import type { WorkflowsService } from './workflows_management_service';
import type { LogSearchResult } from './lib/workflow_logger';

export interface GetWorkflowsParams {
  triggerType?: 'schedule' | 'event' | 'manual';
  limit: number;
  page: number;
  createdBy?: string[];
  enabled?: boolean[];
  query?: string;
  _full?: boolean;
}

export interface GetWorkflowExecutionLogsParams {
  executionId: string;
  stepId?: string;
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

export interface GetStepExecutionParams {
  executionId: string;
  stepId: string;
}

export interface GetExecutionLogsParams {
  executionId: string;
  limit?: number;
  offset?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetStepLogsParams {
  executionId: string;
  limit?: number;
  offset?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  stepId: string;
}

export class WorkflowsManagementApi {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly getWorkflowsExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>
  ) {}

  public async getWorkflows(params: GetWorkflowsParams, spaceId: string): Promise<WorkflowListDto> {
    return await this.workflowsService.searchWorkflows(params, spaceId);
  }

  public async getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null> {
    return await this.workflowsService.getWorkflow(id, spaceId);
  }

  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    return await this.workflowsService.createWorkflow(workflow, spaceId, request);
  }

  public async cloneWorkflow(
    workflow: WorkflowDetailDto,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    const clonedYaml = this.workflowsService.updateYAMLFields(workflow.yaml, {
      name: `${workflow.name} ${i18n.translate('workflowsManagement.cloneSuffix', {
        defaultMessage: 'Copy',
      })}`,
    });
    return await this.workflowsService.createWorkflow({ yaml: clonedYaml }, spaceId, request);
  }

  public async updateWorkflow(
    id: string,
    workflow: Partial<EsWorkflow>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto | null> {
    const originalWorkflow = await this.workflowsService.getWorkflow(id, spaceId);
    if (!originalWorkflow) {
      throw new Error(`Workflow with id ${id} not found`);
    }
    return await this.workflowsService.updateWorkflow(
      id,
      workflow,
      originalWorkflow,
      spaceId,
      request
    );
  }

  public async deleteWorkflows(
    workflowIds: string[],
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    return await this.workflowsService.deleteWorkflows(workflowIds, spaceId, request);
  }

  public async runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, any>
  ): Promise<string> {
    const context = {
      ...inputs,
      spaceId,
    };
    const workflowsExecutionEngine = await this.getWorkflowsExecutionEngine();
    const executeResponse = await workflowsExecutionEngine.executeWorkflow(workflow, context);
    return executeResponse.workflowExecutionId;
  }

  public async testWorkflow(
    workflowYaml: string,
    inputs: Record<string, any>,
    spaceId: string
  ): Promise<string> {
    const parsedYaml = parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE);

    if (parsedYaml.error) {
      // TODO: handle error properly
      // It should throw BadRequestError in the API
      throw parsedYaml.error;
    }

    const workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data as WorkflowYaml);
    const context = {
      ...inputs,
      spaceId,
    };
    const workflowsExecutionEngine = await this.getWorkflowsExecutionEngine();
    const executeResponse = await workflowsExecutionEngine.executeWorkflow(
      {
        id: 'test-workflow',
        name: workflowToCreate.name,
        enabled: workflowToCreate.enabled,
        definition: workflowToCreate.definition,
      },
      context
    );
    return executeResponse.workflowExecutionId;
  }

  public async getWorkflowExecutions(
    workflowId: string,
    spaceId: string
  ): Promise<WorkflowExecutionListDto> {
    return await this.workflowsService.searchWorkflowExecutions(
      {
        workflowId,
      },
      spaceId
    );
  }

  public async getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionDto | null> {
    return await this.workflowsService.getWorkflowExecution(workflowExecutionId, spaceId);
  }

  public async getWorkflowExecutionLogs(
    params: GetWorkflowExecutionLogsParams,
    spaceId: string
  ): Promise<WorkflowExecutionLogsDto> {
    let result: LogSearchResult;
    if (params.stepId) {
      result = await this.workflowsService.getStepLogs(
        {
          executionId: params.executionId,
          stepId: params.stepId,
          limit: params.limit,
          offset: params.offset,
          sortField: params.sortField,
          sortOrder: params.sortOrder,
        },
        spaceId
      );
    } else {
      result = await this.workflowsService.getExecutionLogs(params, spaceId);
    }

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

  public async getStepExecution(
    params: GetStepExecutionParams,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null> {
    return await this.workflowsService.getStepExecution(params, spaceId);
  }

  public async getWorkflowStats(spaceId: string) {
    return await this.workflowsService.getWorkflowStats(spaceId);
  }

  public async getWorkflowAggs(fields: string[] = [], spaceId: string) {
    return await this.workflowsService.getWorkflowAggs(fields, spaceId);
  }
}
