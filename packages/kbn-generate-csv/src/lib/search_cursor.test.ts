/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ISearchClient } from '@kbn/data-plugin/common';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { createSearchRequestHandlerContext } from '@kbn/data-plugin/server/search/mocks';
import { SearchCursor, SearchCursorSettings } from './search_cursor';

describe('CSV Export Search Cursor', () => {
  let settings: SearchCursorSettings;
  let es: IScopedClusterClient;
  let data: ISearchClient;
  let logger: Logger;
  let cursor: SearchCursor;

  beforeEach(async () => {
    settings = {
      scroll: {
        duration: '10m',
        size: 500,
      },
      includeFrozen: false,
      maxConcurrentShardRequests: 5,
    };

    es = elasticsearchServiceMock.createScopedClusterClient();
    data = createSearchRequestHandlerContext();
    jest.spyOn(es.asCurrentUser, 'openPointInTime').mockResolvedValue({ id: 'what-a-pit-id' });

    logger = loggingSystemMock.createLogger();

    cursor = new SearchCursor(
      'test-index-pattern-string',
      undefined,
      settings,
      { data, es },
      logger
    );
    await cursor.initialize();
  });

  it('selects the point-in-time strategy by default', async () => {
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
    cursor.updateIdFromResults({ pit_id: 'yes-this-really-is-a-new-id' });
    expect(cursor.getPagingFieldsForSearchSource()).toMatchObject([
      'pit',
      { id: 'yes-this-really-is-a-new-id', keep_alive: '10m' },
    ]);
  });

  it('manages search_after', () => {
    cursor.setSearchAfter([
      {
        _index: 'test-index',
        _id: 'test-doc-id',
        sort: ['Wed Jan 17 15:35:47 MST 2024', 42],
      },
    ]);
    expect(cursor.getSearchAfter()).toEqual(['Wed Jan 17 15:35:47 MST 2024', 42]);
  });

  describe('scroll strategy', () => {
    beforeEach(async () => {
      cursor = new SearchCursor(
        'test-index-pattern-string',
        'scroll',
        settings,
        { data, es },
        logger
      );
      await cursor.initialize();
    });

    it('supports scroll', async () => {
      const scanSpy = jest
        // @ts-expect-error create spy on private method
        .spyOn(cursor, 'scan')
        // @ts-expect-error mock resolved value for spy on private method
        .mockResolvedValueOnce({ rawResponse: { hits: [] } });

      const searchSource = createSearchSourceMock();
      await cursor.getPage(searchSource);
      expect(scanSpy).toBeCalledTimes(1);
    });
  });
});
