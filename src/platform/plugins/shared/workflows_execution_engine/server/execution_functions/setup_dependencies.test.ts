/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { setupDependencies } from './setup_dependencies';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { ConnectorExecutor } from '../connector_executor';
import { UrlValidator } from '../lib/url_validator';
import type { LogsRepository } from '../repositories/logs_repository';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { NodesFactory } from '../step/nodes_factory';
import { StepExecutionRuntimeFactory } from '../workflow_context_manager/step_execution_runtime_factory';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import { WorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

jest.mock('../connector_executor');
jest.mock('../lib/url_validator');
jest.mock('../step/nodes_factory');
jest.mock('../workflow_context_manager/step_execution_runtime_factory');
jest.mock('../workflow_context_manager/workflow_execution_runtime_manager');
jest.mock('../workflow_context_manager/workflow_execution_state');
jest.mock('../workflow_event_logger/workflow_event_logger');
jest.mock('../workflow_task_manager/workflow_task_manager');
jest.mock('@kbn/workflows/graph');

describe('setupDependencies', () => {
  const workflowRunId = 'test-workflow-run-id';
  const spaceId = 'default';

  const mockWorkflowExecution = {
    id: workflowRunId,
    workflowId: 'test-workflow',
    workflowDefinition: {
      name: 'Test Workflow',
      steps: [],
    },
    spaceId,
    status: 'running',
    startedAt: Date.now(),
  };

  const mockUnsecuredActionsClient = {
    getAll: jest.fn(),
    execute: jest.fn(),
  };

  const mockScopedActionsClient = {
    getAll: jest.fn(),
    execute: jest.fn(),
  };

  const mockActionsPlugin = {
    getUnsecuredActionsClient: jest.fn().mockResolvedValue(mockUnsecuredActionsClient),
    getActionsClientWithRequest: jest.fn().mockResolvedValue(mockScopedActionsClient),
  } as unknown as ActionsPluginStartContract;

  const mockTaskManager = {} as TaskManagerStartContract;

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const mockConfig = {
    logging: {
      console: true,
    },
    http: {
      allowedHosts: ['*'],
    },
  } as WorkflowsExecutionEngineConfig;

  const mockWorkflowExecutionRepository = {
    getWorkflowExecutionById: jest.fn().mockResolvedValue(mockWorkflowExecution),
  } as unknown as WorkflowExecutionRepository;

  const mockStepExecutionRepository = {} as StepExecutionRepository;
  const mockLogsRepository = {} as LogsRepository;

  const cloudSetupMock = cloudMock.createSetup();
  const mockDependencies: ContextDependencies = {
    cloudSetup: cloudSetupMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ConnectorExecutor as jest.Mock).mockImplementation(() => ({}));
    (UrlValidator as jest.Mock).mockImplementation(() => ({}));
    (NodesFactory as jest.Mock).mockImplementation(() => ({}));
    (StepExecutionRuntimeFactory as jest.Mock).mockImplementation(() => ({}));
    (WorkflowExecutionRuntimeManager as jest.Mock).mockImplementation(() => ({}));
    (WorkflowExecutionState as jest.Mock).mockImplementation(() => ({
      getWorkflowExecution: () => mockWorkflowExecution,
    }));
    (WorkflowEventLogger as jest.Mock).mockImplementation(() => ({
      logInfo: jest.fn(),
      logError: jest.fn(),
      createStepLogger: jest.fn(),
    }));
    (WorkflowTaskManager as jest.Mock).mockImplementation(() => ({}));
    (WorkflowGraph as unknown as jest.Mock).mockImplementation(() => ({
      fromWorkflowDefinition: jest.fn().mockReturnThis(),
    }));
  });

  it('should use user-scoped ES client from coreStart', async () => {
    const mockScopedClient = {
      search: jest.fn(),
      index: jest.fn(),
    } as unknown as ElasticsearchClient;

    const mockAsCurrentUser = mockScopedClient;
    const mockAsScoped = jest.fn().mockReturnValue({
      asCurrentUser: mockAsCurrentUser,
    });

    const mockCoreStart = {
      elasticsearch: {
        client: {
          asScoped: mockAsScoped,
        },
      },
    } as unknown as CoreStart;

    const mockFakeRequest = {
      headers: {},
    } as KibanaRequest;

    const result = await setupDependencies(
      workflowRunId,
      spaceId,
      mockActionsPlugin,
      mockTaskManager,
      mockLogger,
      mockConfig,
      mockWorkflowExecutionRepository,
      mockStepExecutionRepository,
      mockLogsRepository,
      mockCoreStart,
      mockDependencies,
      mockFakeRequest
    );

    expect(mockAsScoped).toHaveBeenCalledWith(mockFakeRequest);
    expect(result.esClient).toBe(mockAsCurrentUser);
  });

  it('should use scoped actions client with fakeRequest', async () => {
    const mockScopedClient = {
      search: jest.fn(),
      index: jest.fn(),
    } as unknown as ElasticsearchClient;

    const mockAsCurrentUser = mockScopedClient;
    const mockAsScoped = jest.fn().mockReturnValue({
      asCurrentUser: mockAsCurrentUser,
    });

    const mockCoreStart = {
      elasticsearch: {
        client: {
          asScoped: mockAsScoped,
        },
      },
    } as unknown as CoreStart;

    const mockFakeRequest = {
      headers: {},
    } as KibanaRequest;

    await setupDependencies(
      workflowRunId,
      spaceId,
      mockActionsPlugin,
      mockTaskManager,
      mockLogger,
      mockConfig,
      mockWorkflowExecutionRepository,
      mockStepExecutionRepository,
      mockLogsRepository,
      mockCoreStart,
      mockDependencies,
      mockFakeRequest
    );

    expect(mockActionsPlugin.getActionsClientWithRequest).toHaveBeenCalledWith(mockFakeRequest);
    expect(mockActionsPlugin.getUnsecuredActionsClient).not.toHaveBeenCalled();
    expect(ConnectorExecutor).toHaveBeenCalledWith(mockScopedActionsClient);
  });

  describe('WorkflowGraph', () => {
    it('should call fromWorkflowDefinition with correct workflow definition', async () => {
      const mockScopedClient = {
        search: jest.fn(),
        index: jest.fn(),
      } as unknown as ElasticsearchClient;

      const mockAsCurrentUser = mockScopedClient;
      const mockAsScoped = jest.fn().mockReturnValue({
        asCurrentUser: mockAsCurrentUser,
      });

      const mockCoreStart = {
        elasticsearch: {
          client: {
            asScoped: mockAsScoped,
          },
        },
      } as unknown as CoreStart;

      const mockFakeRequest = {
        headers: {},
      } as KibanaRequest;

      await setupDependencies(
        workflowRunId,
        spaceId,
        mockActionsPlugin,
        mockTaskManager,
        mockLogger,
        mockConfig,
        mockWorkflowExecutionRepository,
        mockStepExecutionRepository,
        mockLogsRepository,
        mockCoreStart,
        mockDependencies,
        mockFakeRequest
      );

      expect(WorkflowGraph.fromWorkflowDefinition).toHaveBeenCalledWith(
        mockWorkflowExecution.workflowDefinition,
        expect.anything()
      );
    });

    it('should call fromWorkflowDefinition with correct default settings', async () => {
      const mockScopedClient = {
        search: jest.fn(),
        index: jest.fn(),
      } as unknown as ElasticsearchClient;

      const mockAsCurrentUser = mockScopedClient;
      const mockAsScoped = jest.fn().mockReturnValue({
        asCurrentUser: mockAsCurrentUser,
      });

      const mockCoreStart = {
        elasticsearch: {
          client: {
            asScoped: mockAsScoped,
          },
        },
      } as unknown as CoreStart;

      const mockFakeRequest = {
        headers: {},
      } as KibanaRequest;

      await setupDependencies(
        workflowRunId,
        spaceId,
        mockActionsPlugin,
        mockTaskManager,
        mockLogger,
        mockConfig,
        mockWorkflowExecutionRepository,
        mockStepExecutionRepository,
        mockLogsRepository,
        mockCoreStart,
        mockDependencies,
        mockFakeRequest
      );

      expect(WorkflowGraph.fromWorkflowDefinition).toHaveBeenCalledWith(expect.anything(), {
        timeout: '6h',
      });
    });
  });
});
