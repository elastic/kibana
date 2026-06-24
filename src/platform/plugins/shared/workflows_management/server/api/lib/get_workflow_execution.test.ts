/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { getWorkflowExecution } from './get_workflow_execution';

const TEST_BACKING_INDEX = '.ds-.workflows-executions-2026.06.22-000001';
const TEST_STEP_BACKING_INDEX = '.ds-.workflows-step-executions-2026.06.22-000001';

describe('getWorkflowExecution', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let executionId: string;

  const getBaseParams = () => ({
    workflowExecutionIndex: '.workflows-executions',
    stepsExecutionIndex: '.workflows-steps',
    workflowExecutionId: executionId,
    spaceId: 'default',
  });

  const baseExecutionDoc = {
    spaceId: 'default',
    workflowId: 'workflow-1',
    status: 'completed',
    startedAt: '2024-01-01T00:00:00Z',
    stepExecutionIds: ['step-doc-1', 'step-doc-2'],
    stepExecutionsIndex: '.ds-.workflows-step-executions-2026.06.22-000001',
    workflowDefinition: { version: '1', name: 'test', enabled: true, triggers: [], steps: [] },
    concurrencyGroupKey: 'streams-ki-onboarding-my-stream',
  };

  beforeEach(() => {
    executionId = 'workflow-execution-1';
    mockEsClient = {
      get: jest.fn(),
      mget: jest.fn(),
      search: jest.fn(),
      indices: {
        getDataStream: jest.fn().mockResolvedValue({
          data_streams: [{ indices: [{ index_name: TEST_BACKING_INDEX }] }],
        }),
      },
    } as any;
    mockLogger = loggerMock.create();
    jest.clearAllMocks();
  });

  describe('source excludes with mget (stepExecutionIds present)', () => {
    beforeEach(() => {
      mockEsClient.mget.mockResolvedValueOnce({
        docs: [
          {
            found: true,
            _id: executionId,
            _index: TEST_BACKING_INDEX,
            _source: baseExecutionDoc,
          },
        ],
      } as any);
      mockEsClient.mget.mockResolvedValueOnce({
        docs: [
          {
            found: true,
            _id: 'step-doc-1',
            _index: TEST_STEP_BACKING_INDEX,
            _source: { stepId: 's1', status: 'completed', globalExecutionIndex: 0 },
          },
          {
            found: true,
            _id: 'step-doc-2',
            _index: TEST_STEP_BACKING_INDEX,
            _source: { stepId: 's2', status: 'completed', globalExecutionIndex: 1 },
          },
        ],
      } as any);
    });

    it('should not pass _source_excludes when both includeInput and includeOutput are true', async () => {
      await getWorkflowExecution({
        ...getBaseParams(),
        esClient: mockEsClient,
        logger: mockLogger,
        includeInput: true,
        includeOutput: true,
      });

      expect(mockEsClient.mget).toHaveBeenCalledWith(
        expect.not.objectContaining({ _source_excludes: expect.anything() })
      );
    });

    it('should pass _source_excludes: ["input", "output"] when both are false', async () => {
      await getWorkflowExecution({
        ...getBaseParams(),
        esClient: mockEsClient,
        logger: mockLogger,
        includeInput: false,
        includeOutput: false,
      });

      expect(mockEsClient.mget).toHaveBeenCalledWith(
        expect.objectContaining({
          _source_excludes: ['input', 'output'],
        })
      );
    });

    it('should pass _source_excludes: ["input"] when only includeInput is false', async () => {
      await getWorkflowExecution({
        ...getBaseParams(),
        esClient: mockEsClient,
        logger: mockLogger,
        includeInput: false,
        includeOutput: true,
      });

      expect(mockEsClient.mget).toHaveBeenCalledWith(
        expect.objectContaining({
          _source_excludes: ['input'],
        })
      );
    });

    it('should pass _source_excludes: ["output"] when only includeOutput is false', async () => {
      await getWorkflowExecution({
        ...getBaseParams(),
        esClient: mockEsClient,
        logger: mockLogger,
        includeInput: true,
        includeOutput: false,
      });

      expect(mockEsClient.mget).toHaveBeenCalledWith(
        expect.objectContaining({
          _source_excludes: ['output'],
        })
      );
    });

    it('should default includeInput and includeOutput to false when omitted', async () => {
      await getWorkflowExecution({
        ...getBaseParams(),
        esClient: mockEsClient,
        logger: mockLogger,
      });

      expect(mockEsClient.mget).toHaveBeenCalledWith(
        expect.objectContaining({
          _source_excludes: ['input', 'output'],
        })
      );
    });
  });

  describe('source excludes with search fallback (no stepExecutionIds)', () => {
    beforeEach(() => {
      mockEsClient.mget.mockResolvedValue({
        docs: [
          {
            found: true,
            _id: executionId,
            _index: TEST_BACKING_INDEX,
            _source: { ...baseExecutionDoc, stepExecutionIds: undefined },
          },
        ],
      } as any);
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
    });

    it('should pass _source excludes to search when includeInput/includeOutput are false', async () => {
      await getWorkflowExecution({
        ...getBaseParams(),
        esClient: mockEsClient,
        logger: mockLogger,
        includeInput: false,
        includeOutput: false,
      });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: { excludes: ['input', 'output'] },
        })
      );
    });

    it('should not pass _source excludes when both flags are true', async () => {
      await getWorkflowExecution({
        ...getBaseParams(),
        esClient: mockEsClient,
        logger: mockLogger,
        includeInput: true,
        includeOutput: true,
      });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.not.objectContaining({
          _source: expect.anything(),
        })
      );
    });
  });

  describe('basic behavior', () => {
    it('should return null when document is not found (404)', async () => {
      mockEsClient.mget.mockResolvedValue({ docs: [{ found: false }] } as any);
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);

      const result = await getWorkflowExecution({
        ...getBaseParams(),
        esClient: mockEsClient,
        logger: mockLogger,
      });

      expect(result).toBeNull();
    });

    it('should return null when spaceId does not match', async () => {
      mockEsClient.mget.mockResolvedValue({
        docs: [
          {
            found: true,
            _source: { ...baseExecutionDoc, spaceId: 'other-space' },
          },
        ],
      } as any);
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);

      const result = await getWorkflowExecution({
        ...getBaseParams(),
        esClient: mockEsClient,
        logger: mockLogger,
      });

      expect(result).toBeNull();
    });

    it('should return the execution DTO with step executions', async () => {
      mockEsClient.mget.mockResolvedValueOnce({
        docs: [{ found: true, _id: executionId, _index: TEST_BACKING_INDEX, _source: baseExecutionDoc }],
      } as any);
      mockEsClient.mget.mockResolvedValueOnce({
        docs: [
          {
            found: true,
            _id: 'step-doc-1',
            _index: TEST_STEP_BACKING_INDEX,
            _source: {
              stepId: 's1',
              status: 'completed',
              globalExecutionIndex: 1,
              output: { result: 'ok' },
            },
          },
          {
            found: true,
            _id: 'step-doc-2',
            _index: TEST_STEP_BACKING_INDEX,
            _source: {
              stepId: 's2',
              status: 'completed',
              globalExecutionIndex: 0,
              input: { arg: 1 },
            },
          },
        ],
      } as any);

      const result = await getWorkflowExecution({
        ...getBaseParams(),
        esClient: mockEsClient,
        logger: mockLogger,
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(executionId);
      expect(result?.stepExecutions).toHaveLength(2);
      expect(result?.concurrencyGroupKey).toBe('streams-ki-onboarding-my-stream');
    });
  });
});
