/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { vi } from 'vitest';
import type { Mock, Mocked, MockedFunction } from 'vitest';

import { ByteSizeValue } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { buildElasticsearchRequest } from '@kbn/workflows';

import type { ElasticsearchGraphNode } from '@kbn/workflows/graph/types';
import { ElasticsearchActionStepImpl } from './elasticsearch_action_step';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

// Only `buildElasticsearchRequest` is stubbed — `getElasticsearchConnectors` stays real so the
// output normalization is driven by the actual connector contracts.
vi.mock('@kbn/workflows', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/workflows')),
    buildElasticsearchRequest: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockedBuildRequest = buildElasticsearchRequest as MockedFunction<
  typeof buildElasticsearchRequest
>;

describe('ElasticsearchActionStepImpl', () => {
  let mockStepExecutionRuntime: Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: Mocked<WorkflowExecutionRuntimeManager>;
  let mockWorkflowLogger: Mocked<IWorkflowEventLogger>;
  let mockContextManager: Mocked<WorkflowContextManager>;
  let mockEsClient: Mocked<ElasticsearchClient>;

  beforeEach(() => {
    mockEsClient = {
      transport: {
        request: vi.fn().mockResolvedValue({ acknowledged: true }),
      },
    } as unknown as Mocked<ElasticsearchClient>;

    mockContextManager = {
      getContext: vi.fn().mockReturnValue({
        workflow: { id: 'test', name: 'test', enabled: true, spaceId: 'default' },
      }),
      getDependencies: vi.fn().mockReturnValue({
        config: { maxResponseSize: new ByteSizeValue(10 * 1024 * 1024) },
      }),
      renderValueAccordingToContext: vi.fn((value) => value),
      getEsClientAsUser: vi.fn().mockReturnValue(mockEsClient),
    } as any;

    mockStepExecutionRuntime = {
      contextManager: mockContextManager,
      startStep: vi.fn().mockResolvedValue(undefined),
      finishStep: vi.fn().mockResolvedValue(undefined),
      failStep: vi.fn().mockResolvedValue(undefined),
      setInput: vi.fn().mockResolvedValue(undefined),
      stepExecutionId: 'test-step-exec-id',
      node: {},
    } as unknown as Mocked<StepExecutionRuntime>;

    mockWorkflowRuntime = {
      navigateToNextNode: vi.fn(),
    } as unknown as Mocked<WorkflowExecutionRuntimeManager>;

    mockWorkflowLogger = {
      logInfo: vi.fn(),
      logError: vi.fn(),
      logDebug: vi.fn(),
    } as unknown as Mocked<IWorkflowEventLogger>;

    vi.clearAllMocks();
  });

  describe('transport.request integration', () => {
    it('should call transport.request with buildElasticsearchRequest output for regular requests', async () => {
      mockedBuildRequest.mockReturnValue({
        method: 'GET',
        path: '/my-test/_search',
        body: { query: { match_all: {} } },
        query: { size: '10' },
      });

      const stepWith = {
        index: 'my-test',
        query: { match_all: {} },
        size: 10,
      };
      const step = {
        id: 'search_step',
        type: 'elasticsearch.search',
        stepId: 'search_step',
        stepType: 'elasticsearch.search',
        configuration: { name: 'search_step', type: 'elasticsearch.search', with: stepWith },
      } as unknown as ElasticsearchGraphNode;

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(stepWith);

      expect(mockedBuildRequest).toHaveBeenCalledWith('elasticsearch.search', stepWith);
      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/my-test/_search?size=10',
          body: { query: { match_all: {} } },
          bulkBody: undefined,
        },
        expect.objectContaining({ maxResponseSize: expect.any(Number) })
      );
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

      const stepWith = {
        index: 'my-test',
        operations: bulkOperations,
      };
      const step = {
        id: 'bulk_step',
        type: 'elasticsearch.bulk',
        stepId: 'bulk_step',
        stepType: 'elasticsearch.bulk',
        configuration: { name: 'bulk_step', type: 'elasticsearch.bulk', with: stepWith },
      } as unknown as ElasticsearchGraphNode;

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(stepWith);

      expect(mockedBuildRequest).toHaveBeenCalledWith('elasticsearch.bulk', stepWith);
      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/my-test/_bulk',
          body: undefined,
          bulkBody: bulkOperations,
        },
        expect.objectContaining({ maxResponseSize: expect.any(Number) })
      );
    });

    it('should append query params to path when present', async () => {
      mockedBuildRequest.mockReturnValue({
        method: 'POST',
        path: '/my-test/_bulk',
        bulkBody: [{ index: {} }, { field: 'value' }],
        query: { refresh: 'wait_for', pipeline: 'my-pipeline' },
      });

      const stepWith = {
        index: 'my-test',
        refresh: 'wait_for',
        pipeline: 'my-pipeline',
        operations: [{ index: {} }, { field: 'value' }],
      };
      const step = {
        id: 'bulk_step',
        type: 'elasticsearch.bulk',
        stepId: 'bulk_step',
        stepType: 'elasticsearch.bulk',
        configuration: { name: 'bulk_step', type: 'elasticsearch.bulk', with: stepWith },
      } as unknown as ElasticsearchGraphNode;

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(stepWith);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/my-test/_bulk?refresh=wait_for&pipeline=my-pipeline',
          body: undefined,
          bulkBody: [{ index: {} }, { field: 'value' }],
        },
        expect.objectContaining({ maxResponseSize: expect.any(Number) })
      );
    });
  });

  describe('raw request format', () => {
    it('should use raw API format when params.request is provided', async () => {
      const stepWith = {
        request: {
          method: 'PUT',
          path: '/my-index/_settings',
          body: { 'index.number_of_replicas': 2 },
        },
      };
      const step = {
        id: 'raw_step',
        type: 'elasticsearch.custom',
        stepId: 'raw_step',
        stepType: 'elasticsearch.custom',
        configuration: { name: 'raw_step', type: 'elasticsearch.custom', with: stepWith },
      } as unknown as ElasticsearchGraphNode;

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(stepWith);

      // Should not call buildElasticsearchRequest for raw format
      expect(mockedBuildRequest).not.toHaveBeenCalled();
      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        {
          method: 'PUT',
          path: '/my-index/_settings',
          body: { 'index.number_of_replicas': 2 },
        },
        expect.objectContaining({ maxResponseSize: expect.any(Number) })
      );
    });

    it('should use raw API format for elasticsearch.request step type', async () => {
      const stepWith = {
        method: 'DELETE',
        path: '/my-index',
      };
      const step = {
        id: 'raw_step',
        type: 'elasticsearch.request',
        stepId: 'raw_step',
        stepType: 'elasticsearch.request',
        configuration: { name: 'raw_step', type: 'elasticsearch.request', with: stepWith },
      } as unknown as ElasticsearchGraphNode;

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(stepWith);

      // Should not call buildElasticsearchRequest for elasticsearch.request type
      expect(mockedBuildRequest).not.toHaveBeenCalled();
      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        { method: 'DELETE', path: '/my-index', body: undefined },
        expect.objectContaining({ maxResponseSize: expect.any(Number) })
      );
    });

    it('should pass headers for elasticsearch.request step type', async () => {
      const stepWith = {
        method: 'GET',
        path: '/my-index/_search',
        body: { query: { match_all: {} } },
        headers: { 'X-Custom-Header': 'value' },
      };
      const step = {
        id: 'raw_step',
        type: 'elasticsearch.request',
        stepId: 'raw_step',
        stepType: 'elasticsearch.request',
        configuration: { name: 'raw_step', type: 'elasticsearch.request', with: stepWith },
      } as unknown as ElasticsearchGraphNode;

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(stepWith);

      expect(mockEsClient.transport.request).toHaveBeenCalledWith(
        { method: 'GET', path: '/my-index/_search', body: { query: { match_all: {} } } },
        expect.objectContaining({
          maxResponseSize: expect.any(Number),
          headers: { 'X-Custom-Header': 'value' },
        })
      );
    });
  });

  describe('output normalization', () => {
    const buildStep = (stepType: string, stepWith: Record<string, unknown>) => {
      const step = {
        id: 'check_index',
        type: stepType,
        stepId: 'check_index',
        stepType,
        configuration: { name: 'check_index', type: stepType, with: stepWith },
      } as unknown as ElasticsearchGraphNode;

      return new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );
    };

    it('should wrap the scalar HEAD response of a HEAD connector in an object', async () => {
      mockedBuildRequest.mockReturnValue({ method: 'HEAD', path: '/my-index' });
      (mockEsClient.transport.request as Mock).mockResolvedValue(true);

      const stepWith = { index: 'my-index' };
      const result = await (buildStep('elasticsearch.indices.exists', stepWith) as any)._run(
        stepWith
      );

      expect(result.output).toEqual({ result: true });
    });

    it('should leave an object response of indices.exists untouched', async () => {
      mockedBuildRequest.mockReturnValue({ method: 'GET', path: '/my-index' });
      (mockEsClient.transport.request as Mock).mockResolvedValue({ 'my-index': {} });

      const stepWith = { index: 'my-index', method: 'GET' };
      const result = await (buildStep('elasticsearch.indices.exists', stepWith) as any)._run(
        stepWith
      );

      expect(result.output).toEqual({ 'my-index': {} });
    });

    it('should leave a null response of indices.exists untouched', async () => {
      mockedBuildRequest.mockReturnValue({ method: 'HEAD', path: '/my-index' });
      (mockEsClient.transport.request as Mock).mockResolvedValue(null);

      const stepWith = { index: 'my-index' };
      const result = await (buildStep('elasticsearch.indices.exists', stepWith) as any)._run(
        stepWith
      );

      expect(result.output).toBeNull();
    });

    it('should NOT wrap scalar responses of connectors that do not default to HEAD', async () => {
      (mockEsClient.transport.request as Mock).mockResolvedValue('green open my-index');

      const stepWith = { method: 'GET', path: '/_cat/indices' };
      const result = await (buildStep('elasticsearch.request', stepWith) as any)._run(stepWith);

      expect(result.output).toBe('green open my-index');
    });

    it('should NOT wrap scalar responses of a non-HEAD connector', async () => {
      mockedBuildRequest.mockReturnValue({ method: 'GET', path: '/my-index/_search' });
      (mockEsClient.transport.request as Mock).mockResolvedValue('raw text');

      const stepWith = { index: 'my-index' };
      const result = await (buildStep('elasticsearch.search', stepWith) as any)._run(stepWith);

      expect(result.output).toBe('raw text');
    });
  });

  describe('response size limit enforcement (Layer 1)', () => {
    it('should map RequestAbortedError with size message to StepSizeLimitExceeded', async () => {
      const sizeError = new errors.RequestAbortedError(
        'The content length (15000000) is bigger than the maximum allowed string (10485760)'
      );
      mockEsClient.transport.request = vi.fn().mockRejectedValue(sizeError);

      const stepWith = {
        index: 'large-index',
        body: { query: { match_all: {} }, size: 10000 },
      };
      const step = {
        id: 'size_limit_step',
        type: 'elasticsearch.search',
        stepId: 'size_limit_step',
        stepType: 'elasticsearch.search',
        configuration: { name: 'size_limit_step', type: 'elasticsearch.search', with: stepWith },
      } as unknown as ElasticsearchGraphNode;

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (esStep as any)._run(stepWith);

      expect(result.error).toBeDefined();
      expect(result.error.type).toBe('StepSizeLimitExceeded');
      expect(result.error.message).toContain('size_limit_step');
      expect(result.error.details.limitBytes).toBe(10 * 1024 * 1024);
      expect(result.output).toBeUndefined();
    });

    it('should NOT map other RequestAbortedError (non-size) to StepSizeLimitExceeded', async () => {
      const abortError = new errors.RequestAbortedError('Request aborted by user');
      mockEsClient.transport.request = vi.fn().mockRejectedValue(abortError);

      const stepWith = {
        index: 'test',
        body: { query: { match_all: {} } },
      };
      const step = {
        id: 'abort_step',
        type: 'elasticsearch.search',
        stepId: 'abort_step',
        stepType: 'elasticsearch.search',
        configuration: { name: 'abort_step', type: 'elasticsearch.search', with: stepWith },
      } as unknown as ElasticsearchGraphNode;

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const result = await (esStep as any)._run(stepWith);

      expect(result.error).toBeDefined();
      // Should be a generic error, not StepSizeLimitExceeded
      expect(result.error.type).not.toBe('StepSizeLimitExceeded');
    });
  });
});
