/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StepExecutionRepository } from './step_execution_repository';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';

const TARGET_INDEX = '.ds-.workflows-step-executions-2026.06.22-000001';
const NEXT_INDEX = '.ds-.workflows-step-executions-2026.06.22-000002';
const LOCATOR = { index: TARGET_INDEX, seqNo: 7, primaryTerm: 2 };

describe('StepExecutionRepository', () => {
  let underTest: StepExecutionRepository;
  let esClient: {
    bulk: jest.Mock;
    mget: jest.Mock;
    search: jest.Mock;
    indices: { getDataStream: jest.Mock };
  };

  beforeEach(() => {
    esClient = {
      bulk: jest.fn(),
      mget: jest.fn(),
      search: jest.fn(),
      indices: {
        getDataStream: jest.fn().mockResolvedValue({
          data_streams: [
            {
              name: WORKFLOWS_STEP_EXECUTIONS_INDEX,
              indices: [{ index_name: TARGET_INDEX }, { index_name: NEXT_INDEX }],
            },
          ],
        }),
      },
    };
    underTest = new StepExecutionRepository(esClient as any);
  });

  describe('bulkUpsert', () => {
    it('creates new step executions through the data stream alias', async () => {
      esClient.bulk.mockResolvedValue({
        errors: false,
        items: [
          {
            create: {
              _id: 'step-1',
              _index: NEXT_INDEX,
              _seq_no: 1,
              _primary_term: 1,
            },
          },
        ],
      });

      const result = await underTest.bulkUpsert([
        {
          operation: 'create',
          doc: { id: 'step-1', stepId: 'my-step', status: 'completed' as any },
        },
      ]);

      expect(esClient.bulk).toHaveBeenCalledWith({
        refresh: false,
        operations: [
          { create: { _index: WORKFLOWS_STEP_EXECUTIONS_INDEX, _id: 'step-1' } },
          expect.objectContaining({
            id: 'step-1',
            stepId: 'my-step',
            '@timestamp': expect.any(String),
          }),
        ],
      });
      expect(result).toEqual({
        'step-1': { index: NEXT_INDEX, seqNo: 1, primaryTerm: 1 },
      });
    });

    it('updates existing step executions through their tracked locator', async () => {
      esClient.bulk.mockResolvedValue({
        errors: false,
        items: [
          {
            update: {
              _id: 'step-1',
              _index: TARGET_INDEX,
              _seq_no: 8,
              _primary_term: 2,
            },
          },
        ],
      });

      const result = await underTest.bulkUpsert([
        {
          operation: 'update',
          doc: { id: 'step-1', status: 'failed' as any },
          locator: LOCATOR,
        },
      ]);

      expect(esClient.bulk).toHaveBeenCalledWith({
        refresh: false,
        operations: [
          {
            update: {
              _index: TARGET_INDEX,
              _id: 'step-1',
              if_seq_no: 7,
              if_primary_term: 2,
            },
          },
          {
            doc: expect.objectContaining({
              id: 'step-1',
              status: 'failed',
              '@timestamp': expect.any(String),
            }),
          },
        ],
      });
      expect(result).toEqual({
        'step-1': { index: TARGET_INDEX, seqNo: 8, primaryTerm: 2 },
      });
    });

    it('returns an empty locator map without calling ES for empty writes', async () => {
      await expect(underTest.bulkUpsert([])).resolves.toEqual({});
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('throws when any write is missing a step execution id', async () => {
      await expect(
        underTest.bulkUpsert([{ operation: 'create', doc: { stepId: 'missing-id' } }])
      ).rejects.toThrow('Step execution ID is required for upsert');
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('throws with per-item details when bulk write has errors', async () => {
      esClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          { create: { _id: 'step-1', _index: TARGET_INDEX, _seq_no: 1, _primary_term: 1 } },
          {
            update: {
              _id: 'step-2',
              status: 409,
              error: { type: 'version_conflict_engine_exception', reason: 'version conflict' },
            },
          },
        ],
      });

      await expect(
        underTest.bulkUpsert([
          { operation: 'create', doc: { id: 'step-1' } },
          { operation: 'update', doc: { id: 'step-2' }, locator: LOCATOR },
        ])
      ).rejects.toThrow('Failed to upsert 1 step executions');
    });
  });

  describe('getStepExecutionsWithLocatorsByIds', () => {
    it('checks recent backing indices and returns locators', async () => {
      esClient.mget.mockResolvedValue({
        docs: [
          { found: false },
          {
            found: true,
            _index: TARGET_INDEX,
            _seq_no: 3,
            _primary_term: 1,
            _source: { id: 'step-1', stepId: 'my-step', status: 'completed' },
          },
        ],
      });

      const result = await underTest.getStepExecutionsWithLocatorsByIds(['step-1']);

      expect(esClient.mget).toHaveBeenCalledWith({
        docs: [
          { _index: NEXT_INDEX, _id: 'step-1' },
          { _index: TARGET_INDEX, _id: 'step-1' },
        ],
      });
      expect(result).toEqual({
        docs: [{ id: 'step-1', stepId: 'my-step', status: 'completed' }],
        locators: { 'step-1': { index: TARGET_INDEX, seqNo: 3, primaryTerm: 1 } },
      });
    });

    it('falls back to ids search for documents outside recent backing indices', async () => {
      esClient.mget.mockResolvedValue({ docs: [{ found: false }] });
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _index: TARGET_INDEX,
              _seq_no: 4,
              _primary_term: 1,
              _source: { id: 'step-1', stepId: 'my-step', status: 'completed' },
            },
          ],
        },
      });

      const result = await underTest.getStepExecutionsWithLocatorsByIds(['step-1']);

      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        seq_no_primary_term: true,
        query: { ids: { values: ['step-1'] } },
        size: 1,
      });
      expect(result.locators['step-1']).toEqual({
        index: TARGET_INDEX,
        seqNo: 4,
        primaryTerm: 1,
      });
    });
  });

  describe('resolveWriteIndex', () => {
    it('returns the latest backing index from the data stream', async () => {
      await expect(underTest.resolveWriteIndex()).resolves.toBe(NEXT_INDEX);
    });
  });
});
