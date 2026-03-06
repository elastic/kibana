/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import YAML from 'yaml';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { ScopedActionsClientMock, UnsecuredActionsClientMock } from './mocks/actions_plugin.mock';
import { ExecutionStateRepositoryMock } from './mocks/execution_state_repository.mock';
import { TaskManagerMock } from './mocks/task_manager.mock';
import type { WorkflowsExecutionEngineConfig } from '../server/config';
import { resumeWorkflow } from '../server/execution_functions';
import { mockContextDependencies } from '../server/execution_functions/__mock__/context_dependencies';
import { runWorkflow } from '../server/execution_functions/run_workflow';

jest.mock('../server/repositories/execution_state_repository/execution_state_repository');

export class WorkflowRunFixture {
  public readonly taskAbortController = new AbortController();
  public readonly dependencies = mockContextDependencies();
  public readonly loggerMock = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as unknown as Logger;
  private readonly sharedExecuteMock = jest.fn();
  public readonly unsecuredActionsClientMock = new UnsecuredActionsClientMock();
  public readonly scopedActionsClientMock = new ScopedActionsClientMock();
  public readonly actionsClientMock = {
    getUnsecuredActionsClient: jest.fn().mockReturnValue(this.unsecuredActionsClientMock),
    getActionsClientWithRequest: jest.fn().mockResolvedValue(this.scopedActionsClientMock),
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
  public readonly executionStateRepositoryMock = new ExecutionStateRepositoryMock();
  public readonly taskManagerMock = TaskManagerMock.create() as unknown as TaskManagerStartContract;

  constructor() {
    const executionStateModule = jest.requireMock(
      '../server/repositories/execution_state_repository/execution_state_repository'
    );
    (executionStateModule.ExecutionStateRepository as jest.Mock).mockImplementation(
      () => this.executionStateRepositoryMock
    );

    this.unsecuredActionsClientMock.execute = this.sharedExecuteMock.mockImplementation((options) =>
      this.unsecuredActionsClientMock.returnMockedConnectorResult(options)
    );
    this.scopedActionsClientMock.execute = this.sharedExecuteMock.mockImplementation((options) => {
      const normalizedOptions = { ...options, id: options.actionId };
      this.sharedExecuteMock.mock.calls[this.sharedExecuteMock.mock.calls.length - 1][0] =
        normalizedOptions;
      return this.scopedActionsClientMock.returnMockedConnectorResult(options);
    });

    this.dependencies.actions = this.actionsClientMock as any;
    this.dependencies.taskManager = this.taskManagerMock as any;
  }

  public runWorkflow({
    workflowYaml,
    inputs,
    event,
  }: {
    workflowYaml: string;
    inputs?: Record<string, any>;
    event?: Record<string, any>;
  }) {
    this.cleanup();
    const workflowDefinition = YAML.parseDocument(workflowYaml).toJSON() as WorkflowYaml;
    const workflowExecution: Partial<EsWorkflowExecution> = {
      id: 'fake_workflow_execution_id',
      workflowRunId: 'fake_workflow_execution_id',
      type: 'workflow',
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
      startedAt: new Date().toISOString(),
      createdBy: 'system',
      triggeredBy: 'system',
    };
    this.executionStateRepositoryMock.workflowExecutions.set(
      'fake_workflow_execution_id',
      workflowExecution as EsWorkflowExecution
    );
    return runWorkflow({
      workflowRunId: 'fake_workflow_execution_id',
      spaceId: 'fake_space_id',
      taskAbortController: this.taskAbortController,
      dependencies: this.dependencies,
      logger: this.loggerMock,
      config: this.configMock,
      fakeRequest: this.fakeKibanaRequest,
    });
  }

  public resumeWorkflow() {
    return resumeWorkflow({
      workflowRunId: 'fake_workflow_execution_id',
      spaceId: 'fake_space_id',
      taskAbortController: this.taskAbortController,
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
    this.cleanup();
    const workflowDefinition = YAML.parseDocument(workflowYaml).toJSON() as WorkflowYaml;
    const workflowExecution: Partial<EsWorkflowExecution> = {
      id: 'fake_workflow_execution_id',
      workflowRunId: 'fake_workflow_execution_id',
      type: 'workflow',
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
      startedAt: new Date().toISOString(),
      createdBy: 'system',
      triggeredBy: 'system',
    };
    this.executionStateRepositoryMock.workflowExecutions.set(
      'fake_workflow_execution_id',
      workflowExecution as EsWorkflowExecution
    );
    return runWorkflow({
      workflowRunId: 'fake_workflow_execution_id',
      spaceId: 'fake_space_id',
      taskAbortController: this.taskAbortController,
      dependencies: this.dependencies,
      logger: this.loggerMock,
      config: this.configMock,
      fakeRequest: this.fakeKibanaRequest,
    });
  }

  private cleanup() {
    jest.clearAllMocks();
    this.executionStateRepositoryMock.workflowExecutions.clear();
    this.executionStateRepositoryMock.stepExecutions.clear();
  }
}
