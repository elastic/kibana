/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ISearchClient } from '@kbn/data-plugin/common';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { createSearchRequestHandlerContext } from '@kbn/data-plugin/server/search/mocks';
import type { SearchCursor, SearchCursorSettings } from './search_cursor';
import { SearchCursorPit } from './search_cursor_pit';

describe('CSV Export Search Cursor', () => {
  let settings: SearchCursorSettings;
  let es: IScopedClusterClient;
  let data: ISearchClient;
  let logger: Logger;
  let cursor: SearchCursor;

  beforeEach(async () => {
    settings = {
      scroll: {
        duration: jest.fn(() => '10m'),
        size: 500,
      },
      includeFrozen: false,
      maxConcurrentShardRequests: 5,
      taskInstanceFields: { startedAt: null, retryAt: null },
    };

    es = elasticsearchServiceMock.createScopedClusterClient();
    data = createSearchRequestHandlerContext();
    jest.spyOn(es.asCurrentUser, 'openPointInTime').mockResolvedValue({ id: 'somewhat-pit-id' });

    logger = loggingSystemMock.createLogger();

    cursor = new SearchCursorPit(
      'test-index-pattern-string',
      settings,
      { data, es },
      new AbortController(),
      logger
    );

    const openPointInTimeSpy = jest
      // @ts-expect-error create spy on private method
      .spyOn(cursor, 'openPointInTime');

    await cursor.initialize();

    expect(openPointInTimeSpy).toBeCalledTimes(1);
  });

  it('supports point-in-time', async () => {
    const searchWithPitSpy = jest
      // @ts-expect-error create spy on private method
      .spyOn(cursor, 'searchWithPit')
      // @ts-expect-error mock resolved value for spy on private method
      .mockResolvedValueOnce({ rawResponse: { hits: [] } });

    const searchSource = createSearchSourceMock();
    await cursor.getPage(searchSource);
    expect(searchWithPitSpy).toBeCalledTimes(1);
  });

  it('can update internal cursor ID', () => {
    cursor.updateIdFromResults({ pit_id: 'very-typical-pit-id', hits: { hits: [] } });
    // @ts-expect-error private field
    expect(cursor.cursorId).toBe('very-typical-pit-id');
  });

  it('manages search_after', () => {
    // @ts-expect-error access private method
    cursor.setSearchAfter([
      {
        _index: 'test-index',
        _id: 'test-doc-id',
        sort: ['Wed Jan 17 15:35:47 MST 2024', 42],
      },
    ]);

    // @ts-expect-error access private method
    expect(cursor.getSearchAfter()).toEqual(['Wed Jan 17 15:35:47 MST 2024', 42]);
  });
});
