/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IndexPatternsFetcher } from '.';
import { elasticsearchServiceMock } from '../../../../core/server/mocks';
import * as indexNotFoundException from './index_not_found_exception.json';

describe('Index Pattern Fetcher - server', () => {
  let indexPatterns: IndexPatternsFetcher;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  const emptyResponse = {
    indices: [],
  };
  const response = {
    indices: ['b'],
    fields: [{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }],
  };
  const patternList = ['a', 'b', 'c'];
  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    indexPatterns = new IndexPatternsFetcher(esClient);
  });
  it('Removes pattern without matching indices', async () => {
    esClient.fieldCaps
      .mockResponseOnce(emptyResponse as unknown as estypes.FieldCapsResponse)
      .mockResponse(response as unknown as estypes.FieldCapsResponse);
    // first field caps request returns empty
    const result = await indexPatterns.validatePatternListActive(patternList);
    expect(result).toEqual(['b', 'c']);
  });
  it('Keeps matching and negating patterns', async () => {
    esClient.fieldCaps
      .mockResponseOnce(emptyResponse as unknown as estypes.FieldCapsResponse)
      .mockResponse(response as unknown as estypes.FieldCapsResponse);
    // first field caps request returns empty
    const result = await indexPatterns.validatePatternListActive(['-a', 'b', 'c']);
    expect(result).toEqual(['-a', 'c']);
  });
  it('Returns all patterns when all match indices', async () => {
    esClient.fieldCaps.mockResponse(response as unknown as estypes.FieldCapsResponse);
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

    esClient.fieldCaps
      .mockResponseOnce(response as unknown as estypes.FieldCapsResponse)
      .mockImplementationOnce(() => {
        return Promise.reject(
          new ServerError('index_not_found_exception', 404, indexNotFoundException)
        );
      });

    indexPatterns = new IndexPatternsFetcher(esClient);
    const result = await indexPatterns.validatePatternListActive(patternList);
    expect(result).toEqual([patternList[0]]);
  });
  it('When allowNoIndices is false, run validatePatternListActive', async () => {
    esClient.fieldCaps.mockResponse(response as unknown as estypes.FieldCapsResponse);
    indexPatterns = new IndexPatternsFetcher(esClient);
    await indexPatterns.getFieldsForWildcard({ pattern: patternList });
    expect(esClient.fieldCaps).toHaveBeenCalledTimes(4);
  });
  it('When allowNoIndices is true, do not run validatePatternListActive', async () => {
    esClient.fieldCaps.mockResponse(response as unknown as estypes.FieldCapsResponse);
    indexPatterns = new IndexPatternsFetcher(esClient, true);
    await indexPatterns.getFieldsForWildcard({ pattern: patternList });
    expect(esClient.fieldCaps).toHaveBeenCalledTimes(1);
  });
});
