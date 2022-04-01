/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging/mocks';
import { topNElasticSearchQuery } from './search_topn';
import { ElasticsearchClient, kibanaResponseFactory } from '../../../../core/server';
import { coreMock } from '../../../../core/server/mocks';
import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';

const anyQuery = 'any::query';
const index = 'test';
const testAgg = { aggs: { test: {} } };

jest.mock('./mappings', () => ({
  newProjectTimeQuery: (proj: string, from: string, to: string) => {
    return anyQuery;
  },
  autoHistogramSumCountOnGroupByField: (searchField: string): AggregationsAggregationContainer => {
    return testAgg;
  },
}));

describe('TopN data from Elasticsearch', () => {
  const context = coreMock.createRequestHandlerContext();
  const client = context.elasticsearch.client.asCurrentUser as ElasticsearchClient;
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('building the query', () => {
    it('filters by projectID and aggregates timerange on histogram', async () => {
      await topNElasticSearchQuery(
        client,
        logger,
        index,
        '123',
        '456',
        '789',
        200,
        'field',
        kibanaResponseFactory
      );
      expect(client.search).toHaveBeenCalledWith({
        index,
        body: {
          query: anyQuery,
          aggs: {
            histogram: testAgg,
          },
        },
      });
    });
  });

  describe('when fetching Stack Traces', () => {
    it('should search first then mget', async () => {
      await topNElasticSearchQuery(
        client,
        logger,
        index,
        '123',
        '456',
        '789',
        200,
        'StackTraceID',
        kibanaResponseFactory
      );
      expect(client.search).toHaveBeenCalledTimes(2);
      expect(client.mget).toHaveBeenCalledTimes(1);
    });
  });
});
