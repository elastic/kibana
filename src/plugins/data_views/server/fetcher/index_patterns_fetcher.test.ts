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
      indices: [],
    },
  };
  const response = {
    body: {
      indices: ['b'],
      fields: [{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }],
    },
  };
  const patternList = ['a', 'b', 'c'];
  beforeEach(() => {
    jest.clearAllMocks();
    esClient = {
      fieldCaps: jest.fn().mockResolvedValueOnce(emptyResponse).mockResolvedValue(response),
    } as unknown as ElasticsearchClient;
    indexPatterns = new IndexPatternsFetcher(esClient);
  });
  it('Removes pattern without matching indices', async () => {
    const result = await indexPatterns.validatePatternListActive(patternList);
    expect(result).toEqual(['b', 'c']);
  });
  it('Returns all patterns when all match indices', async () => {
    esClient = {
      fieldCaps: jest.fn().mockResolvedValue(response),
    } as unknown as ElasticsearchClient;
    indexPatterns = new IndexPatternsFetcher(esClient);
    const result = await indexPatterns.validatePatternListActive(patternList);
    expect(result).toEqual(patternList);
  });
  it('Removes pattern when error is thrown', async () => {
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
      fieldCaps: jest
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
  it('When allowNoIndices is false, run validatePatternListActive', async () => {
    const fieldCapsMock = jest.fn();
    esClient = {
      fieldCaps: fieldCapsMock.mockResolvedValue(response),
    } as unknown as ElasticsearchClient;
    indexPatterns = new IndexPatternsFetcher(esClient);
    await indexPatterns.getFieldsForWildcard({ pattern: patternList });
    expect(fieldCapsMock.mock.calls).toHaveLength(4);
  });
  it('When allowNoIndices is true, do not run validatePatternListActive', async () => {
    const fieldCapsMock = jest.fn();
    esClient = {
      fieldCaps: fieldCapsMock.mockResolvedValue(response),
    } as unknown as ElasticsearchClient;
    indexPatterns = new IndexPatternsFetcher(esClient, true);
    await indexPatterns.getFieldsForWildcard({ pattern: patternList });
    expect(fieldCapsMock.mock.calls).toHaveLength(1);
  });
});
