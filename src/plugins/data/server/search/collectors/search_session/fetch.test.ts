/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsErrorHelpers, Logger } from '@kbn/core/server';
import { fetchProvider } from './fetch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

describe('fetchProvider', () => {
  let fetchFn: any;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockLogger: Logger;

  beforeEach(async () => {
    const kibanaIndex = '123';
    mockLogger = {
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    fetchFn = fetchProvider(kibanaIndex, mockLogger);
  });

  test('returns when ES returns no results', async () => {
    esClient.search.mockResponse({
      aggregations: {
        persisted: {
          buckets: [],
        },
      },
    } as any);

    const collRes = await fetchFn({ esClient });
    expect(collRes.transientCount).toBe(0);
    expect(collRes.persistedCount).toBe(0);
    expect(collRes.totalCount).toBe(0);
    expect(mockLogger.warn).not.toBeCalled();
  });

  test('returns when ES throws an error', async () => {
    esClient.search.mockRejectedValue(
      SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b')
    );

    const collRes = await fetchFn({ esClient });
    expect(collRes.transientCount).toBe(0);
    expect(collRes.persistedCount).toBe(0);
    expect(collRes.totalCount).toBe(0);
    expect(mockLogger.warn).toBeCalledTimes(1);
  });

  test('returns when ES returns full buckets', async () => {
    esClient.search.mockResponse({
      aggregations: {
        persisted: {
          buckets: [
            {
              key_as_string: 'true',
              doc_count: 10,
            },
            {
              key_as_string: 'false',
              doc_count: 7,
            },
          ],
        },
      },
    } as any);

    const collRes = await fetchFn({ esClient });
    expect(collRes.transientCount).toBe(7);
    expect(collRes.persistedCount).toBe(10);
    expect(collRes.totalCount).toBe(17);
  });
});
