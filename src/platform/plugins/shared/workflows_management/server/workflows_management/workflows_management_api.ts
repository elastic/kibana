/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
// TODO: remove eslint exceptions once we have a better way to handle this
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { JsonSchema7Type } from 'zod-to-json-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type {
  ConnectorTypeInfo,
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
import { getJsonSchemaFromYamlSchema, transformWorkflowYamlJsontoEsWorkflow } from '@kbn/workflows';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { LogSearchResult } from './lib/workflow_logger';
import type {
  SearchWorkflowExecutionsParams,
  WorkflowsService,
} from './workflows_management_service';
import { WorkflowValidationError } from '../../common/lib/errors';
import { validateStepNameUniqueness } from '../../common/lib/validate_step_names';
import { parseWorkflowYamlToJSON, stringifyWorkflowDefinition } from '../../common/lib/yaml';

export interface GetWorkflowsParams {
  triggerType?: 'schedule' | 'event' | 'manual';
  size: number;
  page: number;
  createdBy?: string[];
  enabled?: boolean[];
  query?: string;
  _full?: boolean;
}

export interface GetWorkflowExecutionLogsParams {
  executionId: string;
  stepExecutionId?: string;
  size?: number;
  page?: number;
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
  size: number;
  page: number;
}

export interface GetStepExecutionParams {
  executionId: string;
  id: string;
}

export interface GetExecutionLogsParams {
  executionId: string;
  size?: number;
  page?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetStepLogsParams {
  executionId: string;
  size?: number;
  page?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  stepExecutionId: string;
}
export interface GetAvailableConnectorsParams {
  spaceId: string;
  request: KibanaRequest;
}

export interface GetAvailableConnectorsResponse {
  connectorsByType: Record<string, ConnectorTypeInfo>;
  totalConnectors: number;
}

export interface TestWorkflowParams {
  workflowId?: string;
  workflowYaml?: string;
  inputs: Record<string, any>;
  spaceId: string;
  request: KibanaRequest;
}

export class WorkflowsManagementApi {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly getWorkflowsExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>
  ) {}

  public async getWorkflows(params: GetWorkflowsParams, spaceId: string): Promise<WorkflowListDto> {
    return this.workflowsService.getWorkflows(params, spaceId);
  }

  public async getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null> {
    return this.workflowsService.getWorkflow(id, spaceId);
  }

  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    return this.workflowsService.createWorkflow(workflow, spaceId, request);
  }

  public async cloneWorkflow(
    workflow: WorkflowDetailDto,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    // Parse and update the YAML to change the name
    const zodSchema = await this.workflowsService.getWorkflowZodSchema(
      { loose: false },
      spaceId,
      request
    );
    const parsedYaml = parseWorkflowYamlToJSON(workflow.yaml, zodSchema);
    if (parsedYaml.error) {
      throw parsedYaml.error;
    }

    const updatedYaml = {
      ...parsedYaml.data,
      name: `${workflow.name} ${i18n.translate('workflowsManagement.cloneSuffix', {
        defaultMessage: 'Copy',
      })}`,
    };

    // Convert back to YAML string using proper YAML stringification
    const clonedYaml = stringifyWorkflowDefinition(updatedYaml as WorkflowYaml);
    return this.workflowsService.createWorkflow({ yaml: clonedYaml }, spaceId, request);
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
    return this.workflowsService.updateWorkflow(id, workflow, spaceId, request);
  }

  public async deleteWorkflows(
    workflowIds: string[],
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    return this.workflowsService.deleteWorkflows(workflowIds, spaceId);
  }

  public async runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, any>,
    request: KibanaRequest
  ): Promise<string> {
    const { event, ...manualInputs } = inputs;
    const context = {
      event,
      spaceId,
      inputs: manualInputs,
    };
    const workflowsExecutionEngine = await this.getWorkflowsExecutionEngine();
    const executeResponse = await workflowsExecutionEngine.executeWorkflow(
      workflow,
      context,
      request
    );
    return executeResponse.workflowExecutionId;
  }

  public async testWorkflow({
    workflowId,
    workflowYaml,
    inputs,
    spaceId,
    request,
  }: TestWorkflowParams): Promise<string> {
    let resolvedYaml = workflowYaml;
    let resolvedWorkflowId = workflowId;

    if (workflowId && !workflowYaml) {
      const existingWorkflow = await this.workflowsService.getWorkflow(workflowId, spaceId);
      if (!existingWorkflow) {
        throw new WorkflowNotFoundError(workflowId);
      }
      resolvedYaml = existingWorkflow.yaml;
    }

    if (!resolvedWorkflowId) {
      resolvedWorkflowId = 'test-workflow';
    }

    if (!resolvedYaml) {
      throw new Error('Either workflowId or workflowYaml must be provided');
    }

    const zodSchema = await this.workflowsService.getWorkflowZodSchema(
      { loose: false },
      spaceId,
      request
    );
    const parsedYaml = parseWorkflowYamlToJSON(resolvedYaml, zodSchema);

    if (parsedYaml.error) {
      // TODO: handle error properly
      // It should throw BadRequestError in the API
      throw parsedYaml.error;
    }

    // Validate step name uniqueness
    const stepValidation = validateStepNameUniqueness(parsedYaml.data as WorkflowYaml);
    if (!stepValidation.isValid) {
      const errorMessages = stepValidation.errors.map((error) => error.message);
      throw new WorkflowValidationError(
        'Workflow validation failed: Step names must be unique throughout the workflow.',
        errorMessages
      );
    }

    const workflowJson = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data as WorkflowYaml);
    const { event, ...manualInputs } = inputs;
    const context = {
      event,
      spaceId,
      inputs: manualInputs,
    };
    const workflowsExecutionEngine = await this.getWorkflowsExecutionEngine();
    const executeResponse = await workflowsExecutionEngine.executeWorkflow(
      {
        id: resolvedWorkflowId,
        name: workflowJson.name,
        enabled: workflowJson.enabled,
        definition: workflowJson.definition,
        yaml: resolvedYaml,
        isTestRun: true,
      },
      context,
      request
    );
    return executeResponse.workflowExecutionId;
  }

  public async testStep(
    workflowYaml: string,
    stepId: string,
    contextOverride: Record<string, any>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<string> {
    const parsedYaml = parseWorkflowYamlToJSON(
      workflowYaml,
      await this.workflowsService.getWorkflowZodSchema({ loose: false }, spaceId, request)
    );

    if (parsedYaml.error) {
      throw parsedYaml.error;
    }

    const workflowToCreate = transformWorkflowYamlJsontoEsWorkflow(parsedYaml.data as WorkflowYaml);
    const workflowsExecutionEngine = await this.getWorkflowsExecutionEngine();
    const executeResponse = await workflowsExecutionEngine.executeWorkflowStep(
      {
        id: 'test-workflow',
        name: workflowToCreate.name,
        enabled: workflowToCreate.enabled,
        definition: workflowToCreate.definition,
        yaml: workflowYaml,
        isTestRun: true,
        spaceId,
      },
      stepId,
      contextOverride,
      request
    );
    return executeResponse.workflowExecutionId;
  }

  public async getWorkflowExecutions(
    params: SearchWorkflowExecutionsParams,
    spaceId: string
  ): Promise<WorkflowExecutionListDto> {
    return this.workflowsService.getWorkflowExecutions(params, spaceId);
  }

  public async getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionDto | null> {
    return this.workflowsService.getWorkflowExecution(workflowExecutionId, spaceId);
  }

  public async getWorkflowExecutionLogs(
    params: GetWorkflowExecutionLogsParams,
    spaceId: string
  ): Promise<WorkflowExecutionLogsDto> {
    let result: LogSearchResult;
    if (params.stepExecutionId) {
      result = await this.workflowsService.getStepLogs(
        {
          executionId: params.executionId,
          stepExecutionId: params.stepExecutionId,
          size: params.size,
          page: params.page,
          sortField: params.sortField,
          sortOrder: params.sortOrder,
        },
        spaceId
      );
    } else {
      result = await this.workflowsService.getExecutionLogs(params, spaceId);
    }

    const size = params.size || 100;
    const page = params.page || 1;

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
      size,
      page,
    };
  }

  public async getStepExecution(
    params: GetStepExecutionParams,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null> {
    return this.workflowsService.getStepExecution(params, spaceId);
  }

  public async cancelWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<void> {
    const workflowsExecutionEngine = await this.getWorkflowsExecutionEngine();
    return workflowsExecutionEngine.cancelWorkflowExecution(workflowExecutionId, spaceId);
  }

  public async getWorkflowStats(spaceId: string) {
    return this.workflowsService.getWorkflowStats(spaceId);
  }

  public async getWorkflowAggs(fields: string[] = [], spaceId: string) {
    return this.workflowsService.getWorkflowAggs(fields, spaceId);
  }

  public async getAvailableConnectors(
    spaceId: string,
    request: KibanaRequest
  ): Promise<GetAvailableConnectorsResponse> {
    return this.workflowsService.getAvailableConnectors(spaceId, request);
  }

  public async getWorkflowJsonSchema(
    { loose }: { loose: boolean },
    spaceId: string,
    request: KibanaRequest
  ): Promise<JsonSchema7Type> {
    const zodSchema = await this.workflowsService.getWorkflowZodSchema(
      { loose: false },
      spaceId,
      request
    );
    return getJsonSchemaFromYamlSchema(zodSchema);
  }
}
