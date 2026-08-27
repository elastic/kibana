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

import { sharedBulk } from './shared_bulk';

describe('sharedBulk', () => {
  const INDEX = '.workflows-executions';

  const createSetup = () => ({
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    logger: loggerMock.create(),
  });

  it('returns empty items without calling ES for an empty request', async () => {
    const { esClient, logger } = createSetup();

    const result = await sharedBulk(esClient, { items: [] }, logger);

    expect(result.items).toHaveLength(0);
    expect(result.errors).toBe(false);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('response items length and order match the request (1:1 alignment)', async () => {
    const { esClient, logger } = createSetup();
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [
        { create: { _id: 'a', _index: INDEX, result: 'created', _seq_no: 0, _primary_term: 1 } },
        { create: { _id: 'b', _index: INDEX, result: 'created', _seq_no: 1, _primary_term: 1 } },
        { create: { _id: 'c', _index: INDEX, result: 'created', _seq_no: 2, _primary_term: 1 } },
      ],
    } as never);

    const result = await sharedBulk<{ id: string }>(
      esClient,
      {
        items: [
          { operation: 'create', document: { id: 'a' }, index: INDEX },
          { operation: 'create', document: { id: 'b' }, index: INDEX },
          { operation: 'create', document: { id: 'c' }, index: INDEX },
        ],
      },
      logger
    );

    expect(result.items).toHaveLength(3);
    expect(result.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('surfaces per-item errors in the response without throwing', async () => {
    const { esClient, logger } = createSetup();
    esClient.bulk.mockResolvedValue({
      errors: true,
      items: [
        { create: { _id: 'a', _index: INDEX, result: 'created' } },
        {
          create: {
            _id: 'b',
            _index: INDEX,
            error: { type: 'version_conflict_engine_exception', reason: 'document already exists' },
          },
        },
      ],
    } as never);

    const result = await sharedBulk<{ id: string }>(
      esClient,
      {
        items: [
          { operation: 'create', document: { id: 'a' }, index: INDEX },
          { operation: 'create', document: { id: 'b' }, index: INDEX },
        ],
      },
      logger
    );

    expect(result.errors).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].error).toBeUndefined();
    expect(result.items[1].error?.type).toBe('version_conflict_engine_exception');
  });

  it('throws when a response item has no _id', async () => {
    const { esClient, logger } = createSetup();
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [{ create: { _index: INDEX, result: 'created' } }],
    } as never);

    await expect(
      sharedBulk<{ id: string }>(
        esClient,
        { items: [{ operation: 'create', document: { id: 'a' }, index: INDEX }] },
        logger
      )
    ).rejects.toThrow('Unexpected bulk response item without _id');
  });
});
