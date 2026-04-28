/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { buildElasticsearchRequest } from '@kbn/workflows';

import { ElasticsearchActionStepImpl } from './elasticsearch_action_step';
import type { ElasticsearchActionStep } from './elasticsearch_action_step';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

// Mock buildElasticsearchRequest
jest.mock('@kbn/workflows', () => ({
  buildElasticsearchRequest: jest.fn(),
}));

const mockedBuildRequest = buildElasticsearchRequest as jest.MockedFunction<
  typeof buildElasticsearchRequest
>;

describe('ElasticsearchActionStepImpl', () => {
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let mockWorkflowLogger: jest.Mocked<IWorkflowEventLogger>;
  let mockContextManager: jest.Mocked<WorkflowContextManager>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    mockEsClient = {
      transport: {
        request: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
    } as unknown as jest.Mocked<ElasticsearchClient>;

    mockContextManager = {
      getContext: jest.fn().mockReturnValue({
        workflow: { spaceId: 'default' },
      }),
      renderValueAccordingToContext: jest.fn((value) => value),
      getEsClientAsUser: jest.fn().mockReturnValue(mockEsClient),
    } as any;

    mockStepExecutionRuntime = {
      contextManager: mockContextManager,
      startStep: jest.fn().mockResolvedValue(undefined),
      finishStep: jest.fn().mockResolvedValue(undefined),
      failStep: jest.fn().mockResolvedValue(undefined),
      setInput: jest.fn().mockResolvedValue(undefined),
      stepExecutionId: 'test-step-exec-id',
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    mockWorkflowLogger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logDebug: jest.fn(),
    } as any;

    jest.clearAllMocks();
  });

  describe('transport.request integration', () => {
    it('should call transport.request with buildElasticsearchRequest output for regular requests', async () => {
      mockedBuildRequest.mockReturnValue({
        method: 'GET',
        path: '/my-test/_search',
        body: { query: { match_all: {} } },
        query: { size: '10' },
      });

      const step: ElasticsearchActionStep = {
        name: 'search_step',
        type: 'elasticsearch.search',
        spaceId: 'default',
        with: {
          index: 'my-test',
          query: { match_all: {} },
          size: 10,
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockedBuildRequest).toHaveBeenCalledWith('elasticsearch.search', step.with);
      expect(mockEsClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/my-test/_search?size=10',
        body: { query: { match_all: {} } },
        bulkBody: undefined,
      });
    });

    it('should call transport.request with bulkBody for bulk requests', async () => {
      const bulkOperations = [
        { create: { _id: 'doc1' } },
        { field1: 'value1' },
        { delete: { _id: 'doc2' } },
      ];

      mockedBuildRequest.mockReturnValue({
        method: 'POST',
        path: '/my-test/_bulk',
        bulkBody: bulkOperations,
      });

      const step: ElasticsearchActionStep = {
        name: 'bulk_step',
        type: 'elasticsearch.bulk',
        spaceId: 'default',
        with: {
          index: 'my-test',
          operations: bulkOperations,
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockedBuildRequest).toHaveBeenCalledWith('elasticsearch.bulk', step.with);
      expect(mockEsClient.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/my-test/_bulk',
        body: undefined,
        bulkBody: bulkOperations,
      });
    });

    it('should append query params to path when present', async () => {
      mockedBuildRequest.mockReturnValue({
        method: 'POST',
        path: '/my-test/_bulk',
        bulkBody: [{ index: {} }, { field: 'value' }],
        query: { refresh: 'wait_for', pipeline: 'my-pipeline' },
      });

      const step: ElasticsearchActionStep = {
        name: 'bulk_step',
        type: 'elasticsearch.bulk',
        spaceId: 'default',
        with: {
          index: 'my-test',
          refresh: 'wait_for',
          pipeline: 'my-pipeline',
          operations: [{ index: {} }, { field: 'value' }],
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/my-test/_bulk?refresh=wait_for&pipeline=my-pipeline',
        body: undefined,
        bulkBody: [{ index: {} }, { field: 'value' }],
      });
    });
  });

  describe('raw request format', () => {
    it('should use raw API format when params.request is provided', async () => {
      const step: ElasticsearchActionStep = {
        name: 'raw_step',
        type: 'elasticsearch.custom',
        spaceId: 'default',
        with: {
          request: {
            method: 'PUT',
            path: '/my-index/_settings',
            body: { 'index.number_of_replicas': 2 },
          },
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      // Should not call buildElasticsearchRequest for raw format
      expect(mockedBuildRequest).not.toHaveBeenCalled();
      expect(mockEsClient.transport.request).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/my-index/_settings',
        body: { 'index.number_of_replicas': 2 },
      });
    });

    it('should use raw API format for elasticsearch.request step type', async () => {
      const step: ElasticsearchActionStep = {
        name: 'raw_step',
        type: 'elasticsearch.request',
        spaceId: 'default',
        with: {
          method: 'DELETE',
          path: '/my-index',
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      // Should not call buildElasticsearchRequest for elasticsearch.request type
      expect(mockedBuildRequest).not.toHaveBeenCalled();
      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        { method: 'DELETE', path: '/my-index', body: undefined },
        {}
      );
    });

    it('should pass headers for elasticsearch.request step type', async () => {
      const step: ElasticsearchActionStep = {
        name: 'raw_step',
        type: 'elasticsearch.request',
        spaceId: 'default',
        with: {
          method: 'GET',
          path: '/my-index/_search',
          body: { query: { match_all: {} } },
          headers: { 'X-Custom-Header': 'value' },
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        { method: 'GET', path: '/my-index/_search', body: { query: { match_all: {} } } },
        { headers: { 'X-Custom-Header': 'value' } }
      );
    });
  });
});
