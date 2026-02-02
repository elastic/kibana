/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { mockContextDependencies } from './__mock__/context_dependencies';
import { setupDependencies } from './setup_dependencies';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

import '../workflow_event_logger/mocks';
jest.mock('../repositories/workflow_execution_repository');
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

  const mockScopedActionsClient = {
    getAll: jest.fn(),
    execute: jest.fn(),
  };

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

  let mockDependencies: ReturnType<typeof mockContextDependencies>;
  let mockWorkflowExecutionRepository: jest.Mocked<WorkflowExecutionRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDependencies = mockContextDependencies();
    mockDependencies.actions.getActionsClientWithRequest = jest
      .fn()
      .mockResolvedValue(mockScopedActionsClient);

    mockWorkflowExecutionRepository = {
      getWorkflowExecutionById: jest.fn().mockResolvedValue(mockWorkflowExecution),
    } as unknown as jest.Mocked<WorkflowExecutionRepository>;

    (WorkflowExecutionRepository as jest.Mock).mockImplementation(
      () => mockWorkflowExecutionRepository
    );

    const mockWorkflowGraph = {
      fromWorkflowDefinition: jest.fn().mockReturnThis(),
      getStepGraph: jest.fn().mockReturnThis(),
    };
    (WorkflowGraph.fromWorkflowDefinition as jest.Mock) = jest
      .fn()
      .mockReturnValue(mockWorkflowGraph);
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

    mockDependencies.coreStart.elasticsearch.client.asScoped = mockAsScoped;

    const mockFakeRequest = {
      headers: {},
    } as KibanaRequest;

    const result = await setupDependencies(
      workflowRunId,
      spaceId,
      mockLogger,
      mockConfig,
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

    mockDependencies.coreStart.elasticsearch.client.asScoped = jest.fn().mockReturnValue({
      asCurrentUser: mockScopedClient,
    });

    const mockFakeRequest = {
      headers: {},
    } as KibanaRequest;

    await setupDependencies(
      workflowRunId,
      spaceId,
      mockLogger,
      mockConfig,
      mockDependencies,
      mockFakeRequest
    );

    expect(mockDependencies.actions.getActionsClientWithRequest).toHaveBeenCalledWith(
      mockFakeRequest
    );
  });

  describe('WorkflowGraph', () => {
    beforeEach(() => {
      const mockScopedClient = {
        search: jest.fn(),
        index: jest.fn(),
      } as unknown as ElasticsearchClient;

      mockDependencies.coreStart.elasticsearch.client.asScoped = jest.fn().mockReturnValue({
        asCurrentUser: mockScopedClient,
      });
    });

    it('should call fromWorkflowDefinition with correct workflow definition', async () => {
      const mockFakeRequest = {
        headers: {},
      } as KibanaRequest;

      await setupDependencies(
        workflowRunId,
        spaceId,
        mockLogger,
        mockConfig,
        mockDependencies,
        mockFakeRequest
      );

      expect(WorkflowGraph.fromWorkflowDefinition).toHaveBeenCalledWith(
        mockWorkflowExecution.workflowDefinition,
        expect.anything()
      );
    });

    it('should call fromWorkflowDefinition with correct default settings', async () => {
      const mockFakeRequest = {
        headers: {},
      } as KibanaRequest;

      await setupDependencies(
        workflowRunId,
        spaceId,
        mockLogger,
        mockConfig,
        mockDependencies,
        mockFakeRequest
      );

      expect(WorkflowGraph.fromWorkflowDefinition).toHaveBeenCalledWith(expect.anything(), {
        timeout: '6h',
      });
    });
  });
});
