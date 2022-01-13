/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternsFetcher } from '.';
import { ElasticsearchClient } from 'kibana/server';
import * as indexNotFoundException from './index_not_found_exception.json';

describe('Index Pattern Fetcher - server', () => {
  let indexPatterns: IndexPatternsFetcher;
  let esClient: ElasticsearchClient;
  const emptyResponse = {
    body: {
      count: 0,
    },
  };
  const response = {
    body: {
      count: 1115,
    },
  };
  const patternList = ['a', 'b', 'c'];
  beforeEach(() => {
    esClient = {
      count: jest.fn().mockResolvedValueOnce(emptyResponse).mockResolvedValue(response),
    } as unknown as ElasticsearchClient;
    indexPatterns = new IndexPatternsFetcher(esClient);
  });

  it('Removes pattern without matching indices', async () => {
    // first field caps request returns empty
    const result = await indexPatterns.validatePatternListActive(patternList);
    expect(result).toEqual(['b', 'c']);
  });

  it('Keeps matching and negating patterns', async () => {
    // first field caps request returns empty
    const result = await indexPatterns.validatePatternListActive(['-a', 'b', 'c']);
    expect(result).toEqual(['-a', 'c']);
  });

  it('Returns all patterns when all match indices', async () => {
    esClient = {
      count: jest.fn().mockResolvedValue(response),
    } as unknown as ElasticsearchClient;
    indexPatterns = new IndexPatternsFetcher(esClient);
    const result = await indexPatterns.validatePatternListActive(patternList);
    expect(result).toEqual(patternList);
  });
  it('Removes pattern when "index_not_found_exception" error is thrown', async () => {
    class ServerError extends Error {
      public body?: Record<string, any>;
      constructor(
        message: string,
        public readonly statusCode: number,
        errBody?: Record<string, any>
      ) {
        super(message);
        this.body = errBody;
      }
    }

    esClient = {
      count: jest
        .fn()
        .mockResolvedValueOnce(response)
        .mockRejectedValue(
          new ServerError('index_not_found_exception', 404, indexNotFoundException)
        ),
    } as unknown as ElasticsearchClient;
    indexPatterns = new IndexPatternsFetcher(esClient);
    const result = await indexPatterns.validatePatternListActive(patternList);
    expect(result).toEqual([patternList[0]]);
  });
});
