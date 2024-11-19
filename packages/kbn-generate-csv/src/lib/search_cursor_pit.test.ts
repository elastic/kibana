/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';

import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ISearchClient } from '@kbn/search-types';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { createSearchRequestHandlerContext } from '@kbn/data-plugin/server/search/mocks';
import type { SearchCursorSettings } from './search_cursor';
import { SearchCursorPit } from './search_cursor_pit';

class TestSearchCursorPit extends SearchCursorPit {
  constructor(...args: ConstructorParameters<typeof SearchCursorPit>) {
    super(...args);
  }

  public getCursorId() {
    return this.cursorId;
  }

  public openPointInTime() {
    return super.openPointInTime();
  }

  public searchWithPit(...args: Parameters<SearchCursorPit['searchWithPit']>) {
    return super.searchWithPit(...args);
  }

  public setSearchAfter(...args: Parameters<SearchCursorPit['setSearchAfter']>) {
    return super.setSearchAfter(...args);
  }

  public getSearchAfter() {
    return super.getSearchAfter();
  }
}

describe('CSV Export Search Cursor', () => {
  let settings: SearchCursorSettings;
  let es: IScopedClusterClient;
  let data: ISearchClient;
  let logger: Logger;
  let cursor: TestSearchCursorPit;

  let openPointInTimeSpy: jest.SpyInstance<Promise<estypes.OpenPointInTimeResponse>>;

  beforeEach(() => {
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

    openPointInTimeSpy = jest
      .spyOn(es.asCurrentUser, 'openPointInTime')
      .mockResolvedValue({ id: 'somewhat-pit-id' });

    logger = loggingSystemMock.createLogger();
  });

  describe('with default settings', () => {
    beforeEach(async () => {
      cursor = new TestSearchCursorPit(
        'test-index-pattern-string',
        settings,
        { data, es },
        new AbortController(),
        logger
      );

      await cursor.initialize();

      expect(openPointInTimeSpy).toBeCalledTimes(1);
    });

    it('supports pit and max_concurrent_shard_requests', async () => {
      const dataSearchSpy = jest
        .spyOn(data, 'search')
        .mockReturnValue(Rx.of({ rawResponse: { hits: { hits: [] } } }));

      const searchSource = createSearchSourceMock();
      await cursor.getPage(searchSource);

      expect(dataSearchSpy).toBeCalledTimes(1);
      expect(dataSearchSpy).toBeCalledWith(
        {
          params: {
            body: expect.objectContaining({ pit: { id: 'somewhat-pit-id', keep_alive: '10m' } }),
            max_concurrent_shard_requests: 5,
          },
        },
        expect.objectContaining({
          strategy: 'es',
          transport: { maxRetries: 0, requestTimeout: '10m' },
        })
      );
    });

    it('can update internal cursor ID', () => {
      cursor.updateIdFromResults({ pit_id: 'very-typical-pit-id', hits: { hits: [] } });
      expect(cursor.getCursorId()).toBe('very-typical-pit-id');
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
  });

  describe('with max_concurrent_shard_requests=0', () => {
    beforeEach(async () => {
      settings.maxConcurrentShardRequests = 0;

      cursor = new TestSearchCursorPit(
        'test-index-pattern-string',
        settings,
        { data, es },
        new AbortController(),
        logger
      );

      await cursor.initialize();

      expect(openPointInTimeSpy).toBeCalledTimes(1);
    });

    it('suppresses max_concurrent_shard_requests from search body', async () => {
      const dataSearchSpy = jest
        .spyOn(data, 'search')
        .mockReturnValue(Rx.of({ rawResponse: { hits: { hits: [] } } }));

      const searchSource = createSearchSourceMock();
      await cursor.getPage(searchSource);

      expect(dataSearchSpy).toBeCalledTimes(1);
      expect(dataSearchSpy).toBeCalledWith(
        {
          params: {
            body: {
              fields: [],
              pit: { id: 'somewhat-pit-id', keep_alive: '10m' },
              query: { bool: { filter: [], must: [], must_not: [], should: [] } },
              runtime_mappings: {},
              script_fields: {},
              stored_fields: ['*'],
            },
            max_concurrent_shard_requests: undefined,
          },
        },
        {
          abortSignal: expect.any(AbortSignal),
          strategy: 'es',
          transport: { maxRetries: 0, requestTimeout: '10m' },
        }
      );
    });
  });
});
