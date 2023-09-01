/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IndexPatternsFetcher } from '.';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

const rollupResponse = {
  foo: {
    rollup_jobs: [
      {
        index_pattern: 'foo',
        job_id: '123',
        rollup_index: 'foo',
        fields: [],
      },
    ],
  },
};

describe('Index Pattern Fetcher - server', () => {
  let indexPatterns: IndexPatternsFetcher;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  const response = {
    indices: ['b'],
    fields: [{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }],
  };
  const patternList = ['a', 'b', 'c'];
  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    indexPatterns = new IndexPatternsFetcher(esClient, false, true);
  });
  it('calls fieldcaps once', async () => {
    esClient.fieldCaps.mockResponse(response as unknown as estypes.FieldCapsResponse);
    indexPatterns = new IndexPatternsFetcher(esClient, true, true);
    await indexPatterns.getFieldsForWildcard({ pattern: patternList });
    expect(esClient.fieldCaps).toHaveBeenCalledTimes(1);
  });

  it('calls rollup api when given rollup data view', async () => {
    esClient.fieldCaps.mockResponse(response as unknown as estypes.FieldCapsResponse);
    esClient.rollup.getRollupIndexCaps.mockResponse(
      rollupResponse as unknown as estypes.RollupGetRollupIndexCapsResponse
    );
    indexPatterns = new IndexPatternsFetcher(esClient, true, true);
    await indexPatterns.getFieldsForWildcard({
      pattern: patternList,
      type: 'rollup',
      rollupIndex: 'foo',
    });
    expect(esClient.rollup.getRollupIndexCaps).toHaveBeenCalledTimes(1);
  });

  it("doesn't call rollup api when given rollup data view and rollups are disabled", async () => {
    esClient.fieldCaps.mockResponse(response as unknown as estypes.FieldCapsResponse);
    esClient.rollup.getRollupIndexCaps.mockResponse(
      rollupResponse as unknown as estypes.RollupGetRollupIndexCapsResponse
    );
    indexPatterns = new IndexPatternsFetcher(esClient, true, false);
    await indexPatterns.getFieldsForWildcard({
      pattern: patternList,
      type: 'rollup',
      rollupIndex: 'foo',
    });
    expect(esClient.rollup.getRollupIndexCaps).toHaveBeenCalledTimes(0);
  });
});
