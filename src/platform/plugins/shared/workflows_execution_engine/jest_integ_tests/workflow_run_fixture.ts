/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreStart,
  ElasticsearchServiceStart,
  IClusterClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { Client } from '@elastic/elasticsearch';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import YAML from 'yaml';
import type { EsWorkflowExecution, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowsExecutionEngineConfig } from '../server/config';
import { UnsecuredActionsClientMock } from './mocks/actions_plugin_mock';
import {
  LogsRepositoryMock,
  StepExecutionRepositoryMock,
  WorkflowExecutionRepositoryMock,
} from './mocks';
import { runWorkflow } from '../server/execution_functions/run_workflow';
import { TaskManagerMock } from './mocks/task_manager_mock';

export class WorkflowRunFixture {
  /** This prop is just to satisfy runWorkflow function params. Consider having real mock once needed. */
  public readonly esClientMock = {} as unknown as Client;
  public readonly taskAbortController = new AbortController();
  public readonly coreStartMock = {
    elasticsearch: {
      client: {
        asScoped: jest.fn().mockReturnValue({}) as any,
      } as IClusterClient,
    } as ElasticsearchServiceStart,
  } as CoreStart;
  public readonly taskManagerMock = TaskManagerMock.create() as TaskManagerStartContract;
  public readonly loggerMock = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as unknown as Logger;
  public readonly unsecuredActionsClientMock = new UnsecuredActionsClientMock();
  public readonly actionsClientMock = {
    getUnsecuredActionsClient: jest.fn().mockReturnValue(this.unsecuredActionsClientMock),
  } as unknown as ActionsPluginStartContract;
  public readonly configMock = {
    logging: {
      console: true,
    },
    http: {
      allowedHosts: ['*'],
    },
  } as WorkflowsExecutionEngineConfig;
  public readonly fakeKibanaRequest = {} as KibanaRequest;
  public readonly workflowExecutionRepositoryMock = new WorkflowExecutionRepositoryMock();
  public readonly stepExecutionRepositoryMock = new StepExecutionRepositoryMock();
  public readonly logsRepositoryMock = new LogsRepositoryMock();

  public runWorkflow({
    workflowYaml,
    inputs,
    event,
  }: {
    workflowYaml: string;
    inputs?: Record<string, any>;
    event?: Record<string, any>;
  }) {
    // clean up before running workflow
    this.cleanup();
    const workflowDefinition = YAML.parseDocument(workflowYaml).toJSON() as WorkflowYaml;
    const workflowExecution: Partial<EsWorkflowExecution> = {
      id: 'fake_workflow_execution_id',
      spaceId: 'fake_space_id',
      workflowId: 'fake_foreach_id',
      isTestRun: false,
      workflowDefinition,
      context: {
        inputs,
        event,
      },
      status: ExecutionStatus.PENDING,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      triggeredBy: 'system', // <-- new field for scheduled workflows
    };
    this.workflowExecutionRepositoryMock.workflowExecutions.set(
      'fake_workflow_execution_id',
      workflowExecution as EsWorkflowExecution
    );
    return runWorkflow({
      workflowRunId: 'fake_workflow_execution_id',
      spaceId: 'fake_space_id',
      workflowExecutionRepository: this.workflowExecutionRepositoryMock as unknown as any,
      stepExecutionRepository: this.stepExecutionRepositoryMock as unknown as any,
      logsRepository: this.logsRepositoryMock as unknown as any,
      taskAbortController: new AbortController(),
      coreStart: this.coreStartMock,
      esClient: this.esClientMock,
      actions: this.actionsClientMock,
      taskManager: this.taskManagerMock,
      logger: this.loggerMock,
      config: this.configMock,
      fakeRequest: this.fakeKibanaRequest,
    });
  }

  private cleanup() {
    jest.clearAllMocks();
    this.workflowExecutionRepositoryMock.workflowExecutions.clear();
    this.stepExecutionRepositoryMock.stepExecutions.clear();
    this.logsRepositoryMock.logs.clear();
  }
}
