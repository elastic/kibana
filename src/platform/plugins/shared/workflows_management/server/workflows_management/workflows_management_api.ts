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
import { i18n } from '@kbn/i18n';
import { parseWorkflowYamlToJSON } from '../../common/lib/yaml_utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../common/schema';
import type { SchedulerService } from '../scheduler/scheduler_service';
import type { WorkflowsService } from './workflows_management_service';

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

// Decorator to add error logging to API methods
function withErrorLogging<T extends any[], R>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
) {
  const originalMethod = descriptor.value!;

  descriptor.value = async function (...args: T): Promise<R> {
    const logger = (this as any).logger;
    const methodName = propertyKey;

    // Debug: Check if logger is available
    if (!logger) {
      // eslint-disable-next-line no-console
      console.error(`No logger available for method ${methodName}`);
    }

    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      // Fallback to console.error if logger is not available
      if (!logger) {
        // eslint-disable-next-line no-console
        console.error(`WorkflowsManagementApi.${methodName} failed:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          method: methodName,
          errorDetails: error,
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Create a detailed message that will show in console (without stack trace)
        const detailedMessage = `WorkflowsManagementApi.${methodName} failed: ${errorMessage}`;

        logger.error(detailedMessage, {
          error: errorMessage,
          stack: errorStack,
          method: methodName,
          errorDetails: error,
          args: args.map((arg) => {
            // Sanitize args for logging (remove sensitive data)
            if (typeof arg === 'object' && arg !== null) {
              const { request, ...safeArgs } = arg as any;
              return safeArgs;
            }
            return arg;
          }),
        });
      }
      throw error; // Re-throw the original error
    }
  };

  return descriptor;
}

export class WorkflowsManagementApi {
  private securityService: any = null;

  constructor(
    private readonly workflowsService: WorkflowsService,
    private schedulerService: SchedulerService | null = null
  ) {}

  public setSchedulerService(schedulerService: SchedulerService) {
    this.schedulerService = schedulerService;
  }

  @withErrorLogging
  public async getWorkflows(params: GetWorkflowsParams, spaceId: string): Promise<WorkflowListDto> {
    return await this.workflowsService.searchWorkflows(params, spaceId);
  }

  @withErrorLogging
  public async getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null> {
    return await this.workflowsService.getWorkflow(id, spaceId);
  }

  @withErrorLogging
  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    return await this.workflowsService.createWorkflow(workflow, spaceId, request);
  }

  @withErrorLogging
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

  @withErrorLogging
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

  @withErrorLogging
  public async deleteWorkflows(
    workflowIds: string[],
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    return await this.workflowsService.deleteWorkflows(workflowIds, spaceId, request);
  }

  @withErrorLogging
  public async runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, any>
  ): Promise<string> {
    if (!this.schedulerService) {
      throw new Error('Scheduler service not set');
    }
    return await this.schedulerService.runWorkflow(workflow, spaceId, inputs);
  }

  @withErrorLogging
  public async testWorkflow(
    workflowYaml: string,
    inputs: Record<string, any>,
    spaceId: string,
    request?: KibanaRequest
  ): Promise<string> {
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

    // Extract user information from the request if available
    let userContext = null;
    if (request && this.securityService) {
      try {
        const user = this.securityService.authc.getCurrentUser(request);
        if (user) {
          userContext = {
            username: user.username,
            full_name: user.full_name,
            email: user.email,
            profile_uid: user.profile_uid,
            roles: user.roles,
            metadata: user.metadata,
          };
        }
      } catch (error) {
        // If we can't get user info, continue without it
      }
    }

    return await this.schedulerService.runWorkflow(
      {
        id: 'test-workflow',
        name: workflowToCreate.name,
        enabled: workflowToCreate.enabled,
        definition: workflowToCreate.definition,
      },
      spaceId,
      inputs
    );
  }

  @withErrorLogging
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

  @withErrorLogging
  public async getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionDto | null> {
    return await this.workflowsService.getWorkflowExecution(workflowExecutionId, spaceId);
  }

  @withErrorLogging
  public async getWorkflowExecutionLogs(
    params: GetWorkflowExecutionLogsParams,
    spaceId: string
  ): Promise<WorkflowExecutionLogsDto> {
    const result = await this.workflowsService.getExecutionLogs(params.executionId, spaceId);

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

  @withErrorLogging
  public async getWorkflowStats(spaceId: string) {
    return await this.workflowsService.getWorkflowStats(spaceId);
  }

  @withErrorLogging
  public async getWorkflowAggs(fields: string[] = [], spaceId: string) {
    return await this.workflowsService.getWorkflowAggs(fields, spaceId);
  }
}
