/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { buildRequestFromConnector } from '@kbn/workflows';

import { ElasticsearchActionStepImpl } from './elasticsearch_action_step';
import type { ElasticsearchActionStep } from './elasticsearch_action_step';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

// Mock buildRequestFromConnector
jest.mock('@kbn/workflows', () => ({
  buildRequestFromConnector: jest.fn(),
}));

const mockedBuildRequest = buildRequestFromConnector as jest.MockedFunction<
  typeof buildRequestFromConnector
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
      bulk: jest.fn().mockResolvedValue({
        took: 30,
        errors: false,
        items: [],
      }),
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

  describe('bulk request handling', () => {
    beforeEach(() => {
      // Setup buildRequestFromConnector to return a bulk request
      mockedBuildRequest.mockReturnValue({
        method: 'POST',
        path: '/my-test/_bulk',
        body: {
          operations: [{ create: {} }, { test: 'value', another_test: 2 }],
        },
        params: {},
      });
    });

    /**
     * BUG: Current implementation incorrectly processes bulk operations.
     *
     * When a user provides a properly formatted bulk request like:
     *   operations:
     *     - create: {}           # action metadata
     *     - test: "value"        # document body
     *
     * The current code wraps EACH item with { index: {} }, resulting in:
     *   [{ index: {} }, { create: {} }, { index: {} }, { test: "value" }]
     *
     * This causes TWO documents to be indexed instead of one.
     *
     * Expected behavior: Pass operations array directly to ES bulk API:
     *   [{ create: {} }, { test: "value" }]
     */
    it('BUG: should NOT wrap each operation with index action (current buggy behavior)', async () => {
      const step: ElasticsearchActionStep = {
        name: 'bulk_step',
        type: 'elasticsearch.bulk',
        spaceId: 'default',
        with: {
          index: 'my-test',
          operations: [{ create: {} }, { test: 'value', another_test: 2 }],
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockEsClient.bulk).toHaveBeenCalled();
      const bulkCall = (mockEsClient.bulk as jest.Mock).mock.calls[0][0];

      // BUG: Current behavior - each item gets wrapped with { index: {} }
      // This test documents the bug - it will pass with current buggy code
      // After fix, this test should be updated to verify correct behavior
      expect(bulkCall.body).toEqual([
        { index: {} },
        { create: {} }, // BUG: This should be the action, not wrapped
        { index: {} },
        { test: 'value', another_test: 2 }, // BUG: This is the doc, correctly placed but with wrong action
      ]);

      // BUG: 4 items means 2 operations (2 index operations instead of 1 create)
      expect(bulkCall.body).toHaveLength(4);
    });

    it('EXPECTED: should pass operations directly without preprocessing', async () => {
      const step: ElasticsearchActionStep = {
        name: 'bulk_step',
        type: 'elasticsearch.bulk',
        spaceId: 'default',
        with: {
          index: 'my-test',
          operations: [{ create: {} }, { test: 'value', another_test: 2 }],
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockEsClient.bulk).toHaveBeenCalled();
      const bulkCall = (mockEsClient.bulk as jest.Mock).mock.calls[0][0];

      // EXPECTED behavior after fix:
      // Operations should be passed directly as-is
      // This test will FAIL with current buggy code and PASS after fix
      // Uncomment these assertions after fixing the bug:

      expect(bulkCall.body).toEqual([{ create: {} }, { test: 'value', another_test: 2 }]);
      expect(bulkCall.body).toHaveLength(2);
    });

    it('should correctly handle multiple create operations', async () => {
      mockedBuildRequest.mockReturnValue({
        method: 'POST',
        path: '/my-test/_bulk',
        body: {
          operations: [
            { create: { _id: 'doc1' } },
            { field1: 'value1' },
            { create: { _id: 'doc2' } },
            { field2: 'value2' },
          ],
        },
        params: {},
      });

      const step: ElasticsearchActionStep = {
        name: 'bulk_step',
        type: 'elasticsearch.bulk',
        spaceId: 'default',
        with: {
          index: 'my-test',
          operations: [
            { create: { _id: 'doc1' } },
            { field1: 'value1' },
            { create: { _id: 'doc2' } },
            { field2: 'value2' },
          ],
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockEsClient.bulk).toHaveBeenCalled();
      const bulkCall = (mockEsClient.bulk as jest.Mock).mock.calls[0][0];

      // BUG: Current behavior creates 8 items (4 index pairs) instead of 4 (2 create pairs)
      // After fix, should be:
      expect(bulkCall.body).toHaveLength(4);
      expect(bulkCall.body).toEqual([
        { create: { _id: 'doc1' } },
        { field1: 'value1' },
        { create: { _id: 'doc2' } },
        { field2: 'value2' },
      ]);
    });

    it('should support delete operations', async () => {
      mockedBuildRequest.mockReturnValue({
        method: 'POST',
        path: '/my-test/_bulk',
        body: {
          operations: [{ delete: { _id: 'doc1' } }, { delete: { _id: 'doc2' } }],
        },
        params: {},
      });

      const step: ElasticsearchActionStep = {
        name: 'bulk_step',
        type: 'elasticsearch.bulk',
        spaceId: 'default',
        with: {
          index: 'my-test',
          operations: [{ delete: { _id: 'doc1' } }, { delete: { _id: 'doc2' } }],
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockEsClient.bulk).toHaveBeenCalled();
      const bulkCall = (mockEsClient.bulk as jest.Mock).mock.calls[0][0];

      // BUG: Current behavior wraps delete operations with index, creating invalid bulk body
      // After fix, delete operations should be passed directly (delete doesn't need a body)
      expect(bulkCall.body).toEqual([{ delete: { _id: 'doc1' } }, { delete: { _id: 'doc2' } }]);
    });

    it('should support update operations', async () => {
      mockedBuildRequest.mockReturnValue({
        method: 'POST',
        path: '/my-test/_bulk',
        body: {
          operations: [{ update: { _id: 'doc1' } }, { doc: { field: 'updated_value' } }],
        },
        params: {},
      });

      const step: ElasticsearchActionStep = {
        name: 'bulk_step',
        type: 'elasticsearch.bulk',
        spaceId: 'default',
        with: {
          index: 'my-test',
          operations: [{ update: { _id: 'doc1' } }, { doc: { field: 'updated_value' } }],
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockEsClient.bulk).toHaveBeenCalled();
      const bulkCall = (mockEsClient.bulk as jest.Mock).mock.calls[0][0];

      // BUG: Current behavior wraps update operations with index
      // After fix:
      expect(bulkCall.body).toEqual([
        { update: { _id: 'doc1' } },
        { doc: { field: 'updated_value' } },
      ]);
    });

    it('should support mixed operations (index, create, update, delete)', async () => {
      mockedBuildRequest.mockReturnValue({
        method: 'POST',
        path: '/my-test/_bulk',
        body: {
          operations: [
            { index: { _id: 'doc1' } },
            { field: 'indexed' },
            { create: { _id: 'doc2' } },
            { field: 'created' },
            { update: { _id: 'doc3' } },
            { doc: { field: 'updated' } },
            { delete: { _id: 'doc4' } },
          ],
        },
        params: {},
      });

      const step: ElasticsearchActionStep = {
        name: 'bulk_step',
        type: 'elasticsearch.bulk',
        spaceId: 'default',
        with: {
          index: 'my-test',
          operations: [
            { index: { _id: 'doc1' } },
            { field: 'indexed' },
            { create: { _id: 'doc2' } },
            { field: 'created' },
            { update: { _id: 'doc3' } },
            { doc: { field: 'updated' } },
            { delete: { _id: 'doc4' } },
          ],
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockEsClient.bulk).toHaveBeenCalled();
      const bulkCall = (mockEsClient.bulk as jest.Mock).mock.calls[0][0];

      // After fix, should pass through directly:
      expect(bulkCall.body).toHaveLength(7);
      expect(bulkCall.body).toEqual([
        { index: { _id: 'doc1' } },
        { field: 'indexed' },
        { create: { _id: 'doc2' } },
        { field: 'created' },
        { update: { _id: 'doc3' } },
        { doc: { field: 'updated' } },
        { delete: { _id: 'doc4' } },
      ]);
    });

    it('should forward refresh parameter correctly (when no query params in path)', async () => {
      // NOTE: When params are provided, they get appended to the path as query string
      // (e.g., /my-test/_bulk?refresh=wait_for), which breaks the endsWith('/_bulk') check.
      // This test uses empty params to verify refresh forwarding works in that scenario.
      mockedBuildRequest.mockReturnValue({
        method: 'POST',
        path: '/my-test/_bulk',
        body: {
          operations: [{ index: {} }, { test: 'value' }],
        },
        params: {}, // Empty params to avoid query string breaking bulk detection
      });

      const step: ElasticsearchActionStep = {
        name: 'bulk_step',
        type: 'elasticsearch.bulk',
        spaceId: 'default',
        with: {
          index: 'my-test',
          operations: [{ index: {} }, { test: 'value' }],
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      expect(mockEsClient.bulk).toHaveBeenCalled();
      const bulkCall = (mockEsClient.bulk as jest.Mock).mock.calls[0][0];

      // refresh defaults to false when not provided in queryParams
      expect(bulkCall.refresh).toBe(false);
      expect(bulkCall.index).toBe('my-test');
    });

    /**
     * BUG: Query params break bulk request detection.
     *
     * When query params are present (like refresh=wait_for), they get appended to the path
     * making it `/my-test/_bulk?refresh=wait_for`. The check `path.endsWith('/_bulk')` then
     * fails, and the request falls through to transport.request instead of esClient.bulk.
     */
    it('BUG: query params break bulk detection - falls through to transport.request', async () => {
      mockedBuildRequest.mockReturnValue({
        method: 'POST',
        path: '/my-test/_bulk',
        body: {
          operations: [{ index: {} }, { test: 'value' }],
        },
        params: { refresh: 'wait_for' },
      });

      const step: ElasticsearchActionStep = {
        name: 'bulk_step',
        type: 'elasticsearch.bulk',
        spaceId: 'default',
        with: {
          index: 'my-test',
          refresh: 'wait_for',
          operations: [{ index: {} }, { test: 'value' }],
        },
      };

      const esStep = new ElasticsearchActionStepImpl(
        step,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await (esStep as any)._run(step.with);

      // BUG: Because path becomes /my-test/_bulk?refresh=wait_for, bulk detection fails
      // and request goes through transport.request instead
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
      expect(mockEsClient.transport.request).toHaveBeenCalled();
    });
  });

  describe('non-bulk requests', () => {
    it('should use transport.request for non-bulk operations', async () => {
      mockedBuildRequest.mockReturnValue({
        method: 'GET',
        path: '/my-test/_search',
        body: { query: { match_all: {} } },
        params: {},
      });

      const step: ElasticsearchActionStep = {
        name: 'search_step',
        type: 'elasticsearch.search',
        spaceId: 'default',
        with: {
          index: 'my-test',
          query: { match_all: {} },
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
        method: 'GET',
        path: '/my-test/_search',
        body: { query: { match_all: {} } },
      });
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });
  });
});
