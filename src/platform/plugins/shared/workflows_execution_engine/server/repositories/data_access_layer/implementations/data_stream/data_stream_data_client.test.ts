/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { DataStreamDataClient } from './data_stream_data_client';
import type { DataStreamMetadataManager } from './data_stream_metadata_manager';
import type { DocumentVersionManager } from './document_version_manager';

describe('DataStreamDataClient', () => {
  const DATA_STREAM = '.workflows-executions-ds';
  const BACKING_INDEX = '.ds-.workflows-executions-ds-000001';
  const CREATED_AT = '2024-01-01T00:00:00.000Z';

  const createClient = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const versionManager = {
      bulkGetVersions: jest.fn().mockResolvedValue({}),
      bulkGetCachedVersions: jest.fn().mockReturnValue({}),
      setVersion: jest.fn(),
    };
    const metadataManager = {
      getMeta: () => ({
        retentionTime: '90d',
        backingIndexes: [BACKING_INDEX],
        writableIndex: BACKING_INDEX,
      }),
    };
    const dataAccess = new DataStreamDataClient<{ id: string; createdAt: string; status?: string }>(
      {
        esClient,
        dataStreamName: DATA_STREAM,
        versionManager: versionManager as unknown as DocumentVersionManager,
        metadataManager: metadataManager as unknown as DataStreamMetadataManager,
        dateField: 'createdAt',
        logger: loggerMock.create(),
      }
    );
    return { esClient, versionManager, dataAccess };
  };

  it('retries a version-miss upsert create 409 as an update on the backing index', async () => {
    const { esClient, dataAccess } = createClient();

    esClient.bulk
      .mockResolvedValueOnce({
        errors: true,
        items: [
          {
            create: {
              _id: 'a',
              _index: BACKING_INDEX,
              error: {
                type: 'version_conflict_engine_exception',
                reason: 'document already exists (current version [1])',
              },
            },
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        errors: false,
        items: [
          {
            update: {
              _id: 'a',
              _index: BACKING_INDEX,
              result: 'updated',
              _seq_no: 1,
              _primary_term: 1,
            },
          },
        ],
      } as never);

    const result = await dataAccess.bulk({
      items: [
        {
          operation: 'upsert',
          document: { id: 'a', createdAt: CREATED_AT, status: 'running' },
        },
      ],
    });

    expect(result.errors).toBe(false);
    expect(result.items).toEqual([
      expect.objectContaining({ id: 'a', result: 'updated', error: undefined }),
    ]);
    expect(esClient.bulk).toHaveBeenCalledTimes(2);
    expect(esClient.bulk).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        operations: [
          { create: { _id: 'a', _index: DATA_STREAM } },
          { id: 'a', createdAt: CREATED_AT, status: 'running', '@timestamp': CREATED_AT },
        ],
      })
    );
    expect(esClient.bulk).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        operations: [
          { update: { _id: 'a', _index: BACKING_INDEX, retry_on_conflict: 3 } },
          { doc: { id: 'a', createdAt: CREATED_AT, status: 'running' } },
        ],
      })
    );
  });

  it('does not rewrite a true create 409 into an update', async () => {
    const { esClient, dataAccess } = createClient();

    esClient.bulk.mockResolvedValue({
      errors: true,
      items: [
        {
          create: {
            _id: 'a',
            _index: BACKING_INDEX,
            error: {
              type: 'version_conflict_engine_exception',
              reason: 'document already exists',
            },
          },
        },
      ],
    } as never);

    const result = await dataAccess.bulk({
      items: [{ operation: 'create', document: { id: 'a', createdAt: CREATED_AT } }],
    });

    expect(result.errors).toBe(true);
    expect(result.items[0].error?.type).toBe('version_conflict_engine_exception');
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('preserves request order when recovering one upsert among other items', async () => {
    const { esClient, dataAccess } = createClient();

    esClient.bulk
      .mockResolvedValueOnce({
        errors: true,
        items: [
          {
            create: {
              _id: 'a',
              _index: BACKING_INDEX,
              result: 'created',
              _seq_no: 0,
              _primary_term: 1,
            },
          },
          {
            create: {
              _id: 'b',
              _index: BACKING_INDEX,
              error: {
                type: 'version_conflict_engine_exception',
                reason: 'document already exists',
              },
            },
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        errors: false,
        items: [
          {
            update: {
              _id: 'b',
              _index: BACKING_INDEX,
              result: 'updated',
              _seq_no: 2,
              _primary_term: 1,
            },
          },
        ],
      } as never);

    const result = await dataAccess.bulk({
      items: [
        { operation: 'create', document: { id: 'a', createdAt: CREATED_AT } },
        {
          operation: 'upsert',
          document: { id: 'b', createdAt: CREATED_AT, status: 'running' },
        },
      ],
    });

    expect(result.errors).toBe(false);
    expect(result.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(result.items[0].result).toBe('created');
    expect(result.items[1].result).toBe('updated');
  });
});
