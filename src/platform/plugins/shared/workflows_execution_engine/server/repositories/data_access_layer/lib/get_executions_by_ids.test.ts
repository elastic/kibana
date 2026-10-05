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

import { getExecutionsByIds } from './get_executions_by_ids';

describe('getExecutionsByIds', () => {
  const DEFAULT_INDEX = '.workflows-executions';

  const createSetup = () => ({
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    logger: loggerMock.create(),
  });

  it('returns empty arrays without calling ES for empty ids', async () => {
    const { esClient, logger } = createSetup();

    const result = await getExecutionsByIds({
      esClient,
      ids: [],
      defaultIndex: DEFAULT_INDEX,
      logger,
    });

    expect(result.items).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(esClient.mget).not.toHaveBeenCalled();
  });

  it('partitions found docs into items and not-found into missing', async () => {
    const { esClient, logger } = createSetup();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'a', _index: DEFAULT_INDEX, found: true, _source: { id: 'a' } },
        { _id: 'b', _index: DEFAULT_INDEX, found: false },
        { _id: 'c', _index: DEFAULT_INDEX, found: true, _source: { id: 'c' } },
      ],
    } as never);

    const result = await getExecutionsByIds({
      esClient,
      ids: ['a', 'b', 'c'],
      defaultIndex: DEFAULT_INDEX,
      logger,
    });

    expect(result.items.map((i) => i.document.id)).toEqual(['a', 'c']);
    expect(result.missing).toEqual(['b']);
  });

  it('puts all ids in missing when none are found', async () => {
    const { esClient, logger } = createSetup();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'x', _index: DEFAULT_INDEX, found: false },
        { _id: 'y', _index: DEFAULT_INDEX, found: false },
      ],
    } as never);

    const result = await getExecutionsByIds({
      esClient,
      ids: ['x', 'y'],
      defaultIndex: DEFAULT_INDEX,
      logger,
    });

    expect(result.items).toHaveLength(0);
    expect(result.missing).toEqual(['x', 'y']);
  });

  it('every requested id appears in exactly one of items or missing', async () => {
    const { esClient, logger } = createSetup();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'a', _index: DEFAULT_INDEX, found: true, _source: { id: 'a' } },
        { _id: 'b', _index: DEFAULT_INDEX, found: false },
        { _id: 'c', _index: DEFAULT_INDEX, found: true, _source: { id: 'c' } },
        { _id: 'd', _index: DEFAULT_INDEX, found: false },
      ],
    } as never);

    const ids = ['a', 'b', 'c', 'd'];
    const result = await getExecutionsByIds({ esClient, ids, defaultIndex: DEFAULT_INDEX, logger });

    const foundIds = result.items.map((i) => i.document.id);
    const allReturned = [...foundIds, ...result.missing].sort();
    expect(allReturned).toEqual([...ids].sort());
    expect(new Set(allReturned).size).toBe(ids.length);
  });
});
