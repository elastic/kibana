/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Client } from '@elastic/elasticsearch';
import YAML from 'yaml';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import type {
  CoreStart,
  ElasticsearchServiceStart,
  IClusterClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import {
  LogsRepositoryMock,
  StepExecutionRepositoryMock,
  WorkflowExecutionRepositoryMock,
} from './mocks';
import { ScopedActionsClientMock, UnsecuredActionsClientMock } from './mocks/actions_plugin.mock';
import { TaskManagerMock } from './mocks/task_manager.mock';
import type { WorkflowsExecutionEngineConfig } from '../server/config';
import { resumeWorkflow } from '../server/execution_functions';
import { runWorkflow } from '../server/execution_functions/run_workflow';
import type { ContextDependencies } from '../server/workflow_context_manager/types';

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
  public readonly dependencies: ContextDependencies = {
    cloudSetup: cloudMock.createSetup(),
  };
  public readonly taskManagerMock = TaskManagerMock.create() as TaskManagerStartContract;
  public readonly loggerMock = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as unknown as Logger;
  // Create shared execute mock so tests can verify calls regardless of which client is used
  private readonly sharedExecuteMock = jest.fn();
  public readonly unsecuredActionsClientMock = new UnsecuredActionsClientMock();
  public readonly scopedActionsClientMock = new ScopedActionsClientMock();
  public readonly actionsClientMock = {
    getUnsecuredActionsClient: jest.fn().mockReturnValue(this.unsecuredActionsClientMock),
    getActionsClientWithRequest: jest.fn().mockResolvedValue(this.scopedActionsClientMock),
  } as unknown as ActionsPluginStartContract;

  constructor() {
    // Wire both clients to use the same shared execute mock with normalized parameters
    this.unsecuredActionsClientMock.execute = this.sharedExecuteMock.mockImplementation((options) =>
      this.unsecuredActionsClientMock.returnMockedConnectorResult(options)
    );
    this.scopedActionsClientMock.execute = this.sharedExecuteMock.mockImplementation((options) => {
      // Normalize scoped client parameters to match unsecured client for test assertions
      // Convert actionId -> id so tests can check using 'id' parameter
      const normalizedOptions = { ...options, id: options.actionId };
      this.sharedExecuteMock.mock.calls[this.sharedExecuteMock.mock.calls.length - 1][0] =
        normalizedOptions;
      return this.scopedActionsClientMock.returnMockedConnectorResult(options);
    });
  }
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
      workflowExecutionRepository: this.workflowExecutionRepositoryMock as any,
      stepExecutionRepository: this.stepExecutionRepositoryMock as any,
      logsRepository: this.logsRepositoryMock as any,
      taskAbortController: this.taskAbortController,
      coreStart: this.coreStartMock,
      dependencies: this.dependencies,
      esClient: this.esClientMock,
      actions: this.actionsClientMock,
      taskManager: this.taskManagerMock,
      logger: this.loggerMock,
      config: this.configMock,
      fakeRequest: this.fakeKibanaRequest,
    });
  }

  public resumeWorkflow() {
    return resumeWorkflow({
      workflowRunId: 'fake_workflow_execution_id',
      spaceId: 'fake_space_id',
      workflowExecutionRepository: this.workflowExecutionRepositoryMock as any,
      stepExecutionRepository: this.stepExecutionRepositoryMock as any,
      logsRepository: this.logsRepositoryMock as any,
      taskAbortController: this.taskAbortController,
      coreStart: this.coreStartMock,
      esClient: this.esClientMock,
      actions: this.actionsClientMock,
      taskManager: this.taskManagerMock,
      logger: this.loggerMock,
      config: this.configMock,
      fakeRequest: this.fakeKibanaRequest,
      dependencies: this.dependencies,
    });
  }

  public runSingleStep({
    workflowYaml,
    stepId,
    contextOverride,
  }: {
    workflowYaml: string;
    stepId: string;
    contextOverride?: Record<string, any>;
  }) {
    // clean up before running workflow
    this.cleanup();
    const workflowDefinition = YAML.parseDocument(workflowYaml).toJSON() as WorkflowYaml;
    const workflowExecution: Partial<EsWorkflowExecution> = {
      id: 'fake_workflow_execution_id',
      spaceId: 'fake_space_id',
      stepId,
      workflowId: 'fake_foreach_id',
      isTestRun: false,
      workflowDefinition,
      context: {
        contextOverride,
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
      workflowExecutionRepository: this.workflowExecutionRepositoryMock as any,
      stepExecutionRepository: this.stepExecutionRepositoryMock as any,
      logsRepository: this.logsRepositoryMock as any,
      taskAbortController: this.taskAbortController,
      coreStart: this.coreStartMock,
      dependencies: this.dependencies,
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
