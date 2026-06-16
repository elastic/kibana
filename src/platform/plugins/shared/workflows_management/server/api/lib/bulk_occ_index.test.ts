/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { OCC_CONFLICT_STATUS_CODE } from '@kbn/occ';

import { bulkIndexWithOccRetry, type OccWorkflowHit, toOccHit } from './bulk_occ_index';
import type { WorkflowProperties } from '../../storage/workflow_storage';

const logger = loggerMock.create();

const makeSource = (
  id: string,
  overrides: Partial<WorkflowProperties> = {}
): WorkflowProperties => ({
  name: `Workflow ${id}`,
  description: '',
  enabled: true,
  tags: [],
  triggerTypes: [],
  yaml: `name: Workflow ${id}\nenabled: true`,
  definition: null,
  createdBy: 'user1',
  lastUpdatedBy: 'user1',
  spaceId: 'default',
  valid: true,
  deleted_at: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const makeOccHit = (
  id: string,
  seqNo = 1,
  primaryTerm = 1,
  sourceOverrides: Partial<WorkflowProperties> = {}
): OccWorkflowHit => ({
  _id: id,
  _source: makeSource(id, sourceOverrides),
  seqNo,
  primaryTerm,
});

const makeClient = () => ({
  bulk: jest.fn(),
  search: jest.fn(),
});

const makeSearchHit = (
  id: string,
  seqNo: number,
  primaryTerm = 1,
  sourceOverrides: Partial<WorkflowProperties> = {}
) => ({
  _id: id,
  _source: makeSource(id, sourceOverrides),
  _seq_no: seqNo,
  _primary_term: primaryTerm,
});

describe('toOccHit', () => {
  it('maps search hit OCC metadata', () => {
    expect(
      toOccHit({
        _id: 'wf-1',
        _source: makeSource('wf-1'),
        _seq_no: 5,
        _primary_term: 2,
      })
    ).toEqual(makeOccHit('wf-1', 5, 2));
  });

  it('throws when seq_no or primary_term is missing', () => {
    expect(() =>
      toOccHit({
        _id: 'wf-1',
        _source: makeSource('wf-1'),
        _seq_no: 5,
      })
    ).toThrow('Missing seq_no/primary_term for workflow wf-1');
  });
});

describe('bulkIndexWithOccRetry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('bulk indexes with per-item OCC metadata', async () => {
    const client = makeClient();
    client.bulk.mockResolvedValue({
      items: [{ index: { _id: 'wf-1', status: 200 } }],
    });

    const mutate = jest.fn((source: WorkflowProperties) => ({ ...source, enabled: false }));
    const result = await bulkIndexWithOccRetry({
      client: client as any,
      hits: [makeOccHit('wf-1', 7, 2)],
      mutate,
      retryDelayMs: 0,
    });

    expect(result).toEqual({ successIds: ['wf-1'], failures: [] });
    expect(client.bulk).toHaveBeenCalledWith({
      operations: [
        {
          index: {
            _id: 'wf-1',
            if_seq_no: 7,
            if_primary_term: 2,
            document: expect.objectContaining({ enabled: false }),
          },
        },
      ],
      refresh: true,
    });
    expect(mutate).toHaveBeenCalledWith(makeSource('wf-1'));
  });

  it('retries conflicts after refreshing OCC metadata and re-mutating', async () => {
    const client = makeClient();
    client.bulk
      .mockResolvedValueOnce({
        items: [
          {
            index: {
              _id: 'wf-1',
              status: OCC_CONFLICT_STATUS_CODE,
              error: { reason: 'conflict' },
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [{ index: { _id: 'wf-1', status: 200 } }],
      });
    client.search.mockResolvedValue({
      hits: { hits: [makeSearchHit('wf-1', 3, 1, { enabled: false })] },
    });

    const mutate = jest.fn((source: WorkflowProperties) => ({
      ...source,
      tags: ['patched'],
    }));

    const result = await bulkIndexWithOccRetry({
      client: client as any,
      hits: [makeOccHit('wf-1', 1)],
      mutate,
      logger,
      retryDelayMs: 0,
    });

    expect(result).toEqual({ successIds: ['wf-1'], failures: [] });
    expect(client.search).toHaveBeenCalledWith({
      query: { ids: { values: ['wf-1'] } },
      seq_no_primary_term: true,
      size: 1,
      track_total_hits: false,
    });
    expect(client.bulk).toHaveBeenCalledTimes(2);
    expect(client.bulk.mock.calls[1][0].operations[0].index).toEqual(
      expect.objectContaining({ if_seq_no: 3, if_primary_term: 1 })
    );
    expect(mutate).toHaveBeenNthCalledWith(1, makeSource('wf-1'));
    expect(mutate).toHaveBeenNthCalledWith(2, makeSource('wf-1', { enabled: false }));
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Bulk OCC conflict for 1 workflow(s)')
    );
  });

  it('records a failure when conflict retries are exhausted', async () => {
    const client = makeClient();
    client.bulk.mockResolvedValue({
      items: [
        {
          index: {
            _id: 'wf-1',
            status: OCC_CONFLICT_STATUS_CODE,
            error: { reason: 'conflict' },
          },
        },
      ],
    });
    client.search.mockResolvedValue({
      hits: { hits: [makeSearchHit('wf-1', 2)] },
    });

    const result = await bulkIndexWithOccRetry({
      client: client as any,
      hits: [makeOccHit('wf-1')],
      mutate: (source) => source,
      maxRetries: 1,
      retryDelayMs: 0,
    });

    expect(client.bulk).toHaveBeenCalledTimes(2);
    expect(result.successIds).toEqual([]);
    expect(result.failures).toEqual([{ id: 'wf-1', error: 'conflict' }]);
  });

  it('records a failure when a conflicted document disappears during refresh', async () => {
    const client = makeClient();
    client.bulk.mockResolvedValueOnce({
      items: [
        {
          index: {
            _id: 'wf-1',
            status: OCC_CONFLICT_STATUS_CODE,
            error: { reason: 'conflict' },
          },
        },
      ],
    });
    client.search.mockResolvedValue({ hits: { hits: [] } });

    const result = await bulkIndexWithOccRetry({
      client: client as any,
      hits: [makeOccHit('wf-1')],
      mutate: (source) => source,
      retryDelayMs: 0,
    });

    expect(client.bulk).toHaveBeenCalledTimes(1);
    expect(client.search).toHaveBeenCalledTimes(1);
    expect(result.successIds).toEqual([]);
    expect(result.failures).toEqual([
      { id: 'wf-1', error: 'Workflow with id wf-1 not found during OCC retry' },
    ]);
  });

  it('records a failure when refresh returns a document without OCC metadata', async () => {
    const client = makeClient();
    client.bulk.mockResolvedValueOnce({
      items: [
        {
          index: {
            _id: 'wf-1',
            status: OCC_CONFLICT_STATUS_CODE,
            error: { reason: 'conflict' },
          },
        },
      ],
    });
    client.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'wf-1',
            _source: makeSource('wf-1'),
          },
        ],
      },
    });

    const result = await bulkIndexWithOccRetry({
      client: client as any,
      hits: [makeOccHit('wf-1')],
      mutate: (source) => source,
      retryDelayMs: 0,
    });

    expect(client.bulk).toHaveBeenCalledTimes(1);
    expect(result.successIds).toEqual([]);
    expect(result.failures).toEqual([
      { id: 'wf-1', error: 'Missing seq_no/primary_term for workflow wf-1' },
    ]);
  });

  it('collects partial bulk failures without retrying non-conflict errors', async () => {
    const client = makeClient();
    client.bulk.mockResolvedValueOnce({
      items: [
        { index: { _id: 'wf-1', status: 200 } },
        {
          index: {
            _id: 'wf-2',
            status: 400,
            error: { type: 'mapper_parsing_exception', reason: 'bulk fail' },
          },
        },
      ],
    });

    const result = await bulkIndexWithOccRetry({
      client: client as any,
      hits: [makeOccHit('wf-1'), makeOccHit('wf-2', 4, 1)],
      mutate: (source) => source,
      retryDelayMs: 0,
    });

    expect(client.bulk).toHaveBeenCalledTimes(1);
    expect(client.search).not.toHaveBeenCalled();
    expect(result.successIds).toEqual(['wf-1']);
    expect(result.failures).toEqual([{ id: 'wf-2', error: 'bulk fail' }]);
  });

  it('retries only conflicted items in a mixed bulk response', async () => {
    const client = makeClient();
    client.bulk
      .mockResolvedValueOnce({
        items: [
          { index: { _id: 'wf-1', status: 200 } },
          {
            index: {
              _id: 'wf-2',
              status: OCC_CONFLICT_STATUS_CODE,
              error: { reason: 'conflict' },
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [{ index: { _id: 'wf-2', status: 200 } }],
      });
    client.search.mockResolvedValue({
      hits: { hits: [makeSearchHit('wf-2', 9)] },
    });

    const result = await bulkIndexWithOccRetry({
      client: client as any,
      hits: [makeOccHit('wf-1'), makeOccHit('wf-2', 3)],
      mutate: (source) => ({ ...source, enabled: false }),
      retryDelayMs: 0,
    });

    expect(result).toEqual({ successIds: ['wf-1', 'wf-2'], failures: [] });
    expect(client.bulk).toHaveBeenCalledTimes(2);
    expect(client.bulk.mock.calls[1][0].operations).toHaveLength(1);
    expect(client.bulk.mock.calls[1][0].operations[0].index._id).toBe('wf-2');
    expect(client.search).toHaveBeenCalledTimes(1);
  });
});
