/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StepExecutionRepository } from './step_execution_repository';

describe('StepExecutionRepository', () => {
  let underTest: StepExecutionRepository;
  let esClient: {
    index: jest.Mock;
    update: jest.Mock;
    bulk: jest.Mock;
    indices: { exists: jest.Mock; create: jest.Mock };
  };

  beforeEach(() => {
    esClient = {
      index: jest.fn(),
      update: jest.fn(),
      bulk: jest.fn(),
      indices: {
        exists: jest.fn().mockResolvedValue(false),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    underTest = new StepExecutionRepository(esClient as any);
  });

  describe('bulkUpsert', () => {
    it('should successfully upsert multiple step executions', async () => {
      const stepExecutions = [
        { id: 'step-1', stepId: 'test-step-1', status: 'completed' },
        { id: 'step-2', stepId: 'test-step-2', status: 'running' },
        { id: 'step-3', stepId: 'test-step-3', status: 'pending' },
      ];

      esClient.bulk.mockResolvedValue({
        errors: false,
        items: [
          { update: { _id: 'step-1', status: 200 } },
          { update: { _id: 'step-2', status: 200 } },
          { update: { _id: 'step-3', status: 200 } },
        ],
      });

      await underTest.bulkUpsert(stepExecutions as any);

      expect(esClient.bulk).toHaveBeenCalledWith({
        refresh: false,
        index: expect.any(String),
        body: [
          { update: { _id: 'step-1' } },
          { doc: stepExecutions[0], doc_as_upsert: true },
          { update: { _id: 'step-2' } },
          { doc: stepExecutions[1], doc_as_upsert: true },
          { update: { _id: 'step-3' } },
          { doc: stepExecutions[2], doc_as_upsert: true },
        ],
      });
    });

    it('should handle empty array without making ES call', async () => {
      await underTest.bulkUpsert([]);

      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('should throw error if step execution does not have an id', async () => {
      const stepExecutions = [
        { id: 'step-1', stepId: 'test-step-1' },
        { stepId: 'test-step-2' }, // Missing id
      ];

      await expect(underTest.bulkUpsert(stepExecutions as any)).rejects.toThrow(
        'Step execution ID is required for upsert'
      );

      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('should throw error with details when bulk operation has errors', async () => {
      const stepExecutions = [
        { id: 'step-1', stepId: 'test-step-1', status: 'completed' },
        { id: 'step-2', stepId: 'test-step-2', status: 'running' },
        { id: 'step-3', stepId: 'test-step-3', status: 'pending' },
      ];

      esClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          { update: { _id: 'step-1', status: 200 } },
          {
            update: {
              _id: 'step-2',
              status: 409,
              error: {
                type: 'version_conflict_engine_exception',
                reason: 'version conflict',
              },
            },
          },
          {
            update: {
              _id: 'step-3',
              status: 400,
              error: {
                type: 'mapper_parsing_exception',
                reason: 'failed to parse field [status]',
              },
            },
          },
        ],
      });

      await expect(underTest.bulkUpsert(stepExecutions as any)).rejects.toThrow(
        'Failed to upsert 2 step executions'
      );

      expect(esClient.bulk).toHaveBeenCalled();
    });

    it('should include error details in exception message', async () => {
      const stepExecutions = [{ id: 'step-1', stepId: 'test-step-1' }];

      const errorDetails = {
        type: 'mapper_parsing_exception',
        reason: 'failed to parse field [executionTimeMs]',
      };

      esClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          {
            update: {
              _id: 'step-1',
              status: 400,
              error: errorDetails,
            },
          },
        ],
      });

      try {
        await underTest.bulkUpsert(stepExecutions as any);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Failed to upsert 1 step executions');
        expect(error.message).toContain('step-1');
        expect(error.message).toContain('mapper_parsing_exception');
      }
    });

    it('should handle partial success by only throwing errors for failed items', async () => {
      const stepExecutions = [
        { id: 'step-1', stepId: 'test-step-1' },
        { id: 'step-2', stepId: 'test-step-2' },
        { id: 'step-3', stepId: 'test-step-3' },
      ];

      esClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          { update: { _id: 'step-1', status: 200 } }, // Success
          {
            update: {
              _id: 'step-2',
              status: 409,
              error: { type: 'version_conflict_engine_exception' },
            },
          }, // Error
          { update: { _id: 'step-3', status: 201 } }, // Success
        ],
      });

      try {
        await underTest.bulkUpsert(stepExecutions as any);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Failed to upsert 1 step executions');
        expect(error.message).toContain('step-2');
        expect(error.message).not.toContain('step-1');
        expect(error.message).not.toContain('step-3');
      }
    });

    it('should use doc_as_upsert flag for each document', async () => {
      const stepExecutions = [{ id: 'step-1', stepId: 'test-step-1', status: 'completed' }];

      esClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ update: { _id: 'step-1', status: 200 } }],
      });

      await underTest.bulkUpsert(stepExecutions as any);

      const bulkCall = esClient.bulk.mock.calls[0][0];
      expect(bulkCall.body[1]).toEqual({
        doc: stepExecutions[0],
        doc_as_upsert: true,
      });
    });

    it('should handle single step execution', async () => {
      const stepExecutions = [{ id: 'step-1', stepId: 'test-step-1', status: 'completed' }];

      esClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ update: { _id: 'step-1', status: 200 } }],
      });

      await underTest.bulkUpsert(stepExecutions as any);

      expect(esClient.bulk).toHaveBeenCalledWith({
        refresh: false,
        index: expect.any(String),
        body: [{ update: { _id: 'step-1' } }, { doc: stepExecutions[0], doc_as_upsert: true }],
      });
    });

    it('should preserve all fields in partial updates', async () => {
      const stepExecutions = [
        {
          id: 'step-1',
          stepId: 'test-step-1',
          status: 'completed',
          finishedAt: '2025-10-28T10:00:00Z',
          executionTimeMs: 5000,
          output: { result: 'success' },
        },
      ];

      esClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ update: { _id: 'step-1', status: 200 } }],
      });

      await underTest.bulkUpsert(stepExecutions as any);

      const bulkCall = esClient.bulk.mock.calls[0][0];
      expect(bulkCall.body[1].doc).toEqual(stepExecutions[0]);
    });

    it('should handle multiple validation errors', async () => {
      const stepExecutions = [
        { stepId: 'test-step-1' }, // Missing id
        { stepId: 'test-step-2' }, // Missing id
      ];

      await expect(underTest.bulkUpsert(stepExecutions as any)).rejects.toThrow(
        'Step execution ID is required for upsert'
      );
    });

    it('should use refresh: false to avoid blocking on index refresh', async () => {
      const stepExecutions = [{ id: 'step-1', stepId: 'test-step-1' }];

      esClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ update: { _id: 'step-1', status: 200 } }],
      });

      await underTest.bulkUpsert(stepExecutions as any);

      expect(esClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh: false,
        })
      );
    });
  });
});
