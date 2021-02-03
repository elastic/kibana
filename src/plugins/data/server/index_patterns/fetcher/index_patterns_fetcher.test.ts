/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IndexPatternsFetcher } from '.';
import { ElasticsearchClient } from 'kibana/server';

describe('Index Pattern Fetcher - server', () => {
  let indexPatterns: IndexPatternsFetcher;
  let esClient: ElasticsearchClient;
  const emptyResponse = {
    body: {
      indices: [],
    },
  };
  const response = {
    body: {
      indices: ['hello', 'world'],
    },
  };
  const patternList = ['a', 'b', 'c'];
  beforeEach(() => {
    esClient = ({
      transport: {
        request: jest.fn().mockReturnValueOnce(emptyResponse).mockReturnValue(response),
      },
    } as unknown) as ElasticsearchClient;
    indexPatterns = new IndexPatternsFetcher(esClient);
  });

  it('Removes pattern without matching indices', async () => {
    const result = await indexPatterns.validatePatternListActive(patternList);
    expect(result).toEqual(['b', 'c']);
  });

  it('Returns all patterns when all match indices', async () => {
    esClient = ({
      transport: {
        request: jest.fn().mockReturnValue(response),
      },
    } as unknown) as ElasticsearchClient;
    indexPatterns = new IndexPatternsFetcher(esClient);
    const result = await indexPatterns.validatePatternListActive(patternList);
    expect(result).toEqual(patternList);
  });
});
