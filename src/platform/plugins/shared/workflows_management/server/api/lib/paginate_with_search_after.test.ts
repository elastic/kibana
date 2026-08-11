/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';

import { paginateWithSearchAfter } from './paginate_with_search_after';

const logger = loggerMock.create();

const makeHit = (id: string, sort?: unknown[]) => ({
  _id: id,
  _source: { name: id },
  sort,
});

const makeSearchResponse = (hits: Array<ReturnType<typeof makeHit>>) => ({
  hits: { hits, total: { value: hits.length } },
});

describe('paginateWithSearchAfter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('processes a single page of results', async () => {
    const search = jest.fn().mockResolvedValueOnce(makeSearchResponse([makeHit('a')]));
    const onPage = jest.fn();

    const result = await paginateWithSearchAfter(
      { search, pageSize: 10, logger, operationName: 'test' },
      onPage
    );

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(undefined);
    expect(onPage).toHaveBeenCalledTimes(1);
    expect(onPage).toHaveBeenCalledWith([expect.objectContaining({ _id: 'a' })]);
    expect(result).toEqual({ totalProcessed: 1, truncated: false });
  });

  it('paginates through multiple pages using search_after', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(makeSearchResponse([makeHit('a', [1]), makeHit('b', [2])]))
      .mockResolvedValueOnce(makeSearchResponse([makeHit('c')]));

    const onPage = jest.fn();

    const result = await paginateWithSearchAfter(
      { search, pageSize: 2, logger, operationName: 'test' },
      onPage
    );

    expect(search).toHaveBeenCalledTimes(2);
    expect(search).toHaveBeenNthCalledWith(1, undefined);
    expect(search).toHaveBeenNthCalledWith(2, [2]);
    expect(onPage).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ totalProcessed: 3, truncated: false });
  });

  it('stops at maxPages and reports truncation', async () => {
    const search = jest
      .fn()
      .mockResolvedValue(makeSearchResponse([makeHit('a', [1]), makeHit('b', [2])]));
    const onPage = jest.fn();

    const result = await paginateWithSearchAfter(
      { search, pageSize: 2, maxPages: 2, logger, operationName: 'testOp' },
      onPage
    );

    expect(search).toHaveBeenCalledTimes(2);
    expect(onPage).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ totalProcessed: 4, truncated: true });
    expect(logger.warn).toHaveBeenCalledWith('testOp truncated at 2 pages (4 processed)');
  });

  it('stops when a page returns empty results', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(makeSearchResponse([makeHit('a', [1]), makeHit('b', [2])]))
      .mockResolvedValueOnce(makeSearchResponse([]));

    const onPage = jest.fn();

    const result = await paginateWithSearchAfter(
      { search, pageSize: 2, logger, operationName: 'test' },
      onPage
    );

    expect(search).toHaveBeenCalledTimes(2);
    expect(onPage).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ totalProcessed: 2, truncated: false });
  });

  it('filters out hits with null _id or _source', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(
        makeSearchResponse([
          makeHit('a'),
          { _id: null, _source: { name: 'bad' } } as any,
          { _id: 'c', _source: null } as any,
        ])
      );
    const onPage = jest.fn();

    await paginateWithSearchAfter({ search, pageSize: 10, logger, operationName: 'test' }, onPage);

    expect(onPage).toHaveBeenCalledWith([expect.objectContaining({ _id: 'a' })]);
  });

  it('breaks silently when sort is missing (default)', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(makeSearchResponse([makeHit('a'), makeHit('b')]));
    const onPage = jest.fn();

    const result = await paginateWithSearchAfter(
      { search, pageSize: 2, logger, operationName: 'test' },
      onPage
    );

    expect(onPage).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ totalProcessed: 2, truncated: false });
  });

  it('throws when sort is missing and throwOnMissingSort is true', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(makeSearchResponse([makeHit('a'), makeHit('b')]));
    const onPage = jest.fn();

    await expect(
      paginateWithSearchAfter(
        {
          search,
          pageSize: 2,
          logger,
          operationName: 'test',
          throwOnMissingSort: true,
        },
        onPage
      )
    ).rejects.toThrow('Missing sort value on last hit');
  });
});
