/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ISearchClient } from '@kbn/search-types';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { createSearchRequestHandlerContext } from '@kbn/data-plugin/server/search/mocks';
import type { SearchCursorSettings } from './search_cursor';
import { SearchCursorScroll } from './search_cursor_scroll';

class TestSearchCursorScroll extends SearchCursorScroll {
  constructor(...args: ConstructorParameters<typeof SearchCursorScroll>) {
    super(...args);
  }

  public getCursorId() {
    return this.cursorId;
  }
}

describe('CSV Export Search Cursor', () => {
  let settings: SearchCursorSettings;
  let es: IScopedClusterClient;
  let data: ISearchClient;
  let logger: Logger;
  let cursor: TestSearchCursorScroll;

  beforeEach(() => {
    settings = {
      scroll: {
        duration: jest.fn(() => '10m'),
        size: 500,
      },
      includeFrozen: false,
      taskInstanceFields: { startedAt: null, retryAt: null },
      maxConcurrentShardRequests: 5,
    };

    es = elasticsearchServiceMock.createScopedClusterClient();
    data = createSearchRequestHandlerContext();
    jest.spyOn(es.asCurrentUser, 'openPointInTime').mockResolvedValue({ id: 'simply-scroll-id' });

    logger = loggingSystemMock.createLogger();
  });

  describe('with default settings', () => {
    beforeEach(async () => {
      cursor = new TestSearchCursorScroll(
        'test-index-pattern-string',
        settings,
        { data, es },
        new AbortController(),
        logger
      );

      await cursor.initialize();
    });

    it('supports scan/scroll and max_concurrent_shard_requests', async () => {
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
              query: { bool: { filter: [], must: [], must_not: [], should: [] } },
              runtime_mappings: {},
              script_fields: {},
              stored_fields: ['*'],
            },
            ignore_throttled: undefined,
            index: 'test-index-pattern-string',
            max_concurrent_shard_requests: 5,
            scroll: '10m',
            size: 500,
          },
        },
        {
          abortSignal: expect.any(AbortSignal),
          strategy: 'es',
          transport: { maxRetries: 0, requestTimeout: '10m' },
        }
      );
    });

    it('can update internal cursor ID', () => {
      cursor.updateIdFromResults({ _scroll_id: 'not-unusual-scroll-id' });
      expect(cursor.getCursorId()).toBe('not-unusual-scroll-id');
    });
  });

  describe('with max_concurrent_shard_requests=0', () => {
    beforeEach(async () => {
      settings.maxConcurrentShardRequests = 0;

      cursor = new TestSearchCursorScroll(
        'test-index-pattern-string',
        settings,
        { data, es },
        new AbortController(),
        logger
      );

      await cursor.initialize();
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
              query: { bool: { filter: [], must: [], must_not: [], should: [] } },
              runtime_mappings: {},
              script_fields: {},
              stored_fields: ['*'],
            },
            ignore_throttled: undefined,
            index: 'test-index-pattern-string',
            max_concurrent_shard_requests: undefined,
            scroll: '10m',
            size: 500,
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
