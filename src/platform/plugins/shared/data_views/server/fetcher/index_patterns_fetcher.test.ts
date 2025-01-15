/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IndexPatternsFetcher } from '.';
import { elasticsearchServiceMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { DataViewMissingIndices, DataViewType } from '../../common';

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
  const uiSettingsClient = uiSettingsServiceMock
    .createStartContract()
    .asScopedToClient({} as SavedObjectsClientContract);
  const optionalParams = {
    uiSettingsClient,
    allowNoIndices: true,
    rollupsEnabled: true,
  };
  const response = {
    indices: ['b'],
    fields: [{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }],
  };
  const patternList = ['a', 'b', 'c'];
  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.fieldCaps.mockResponse(response as unknown as estypes.FieldCapsResponse);
    indexPatterns = new IndexPatternsFetcher(esClient, {
      uiSettingsClient,
      allowNoIndices: false,
      rollupsEnabled: true,
    });
  });
  it('calls fieldcaps once', async () => {
    indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
    await indexPatterns.getFieldsForWildcard({ pattern: patternList });
    expect(esClient.fieldCaps).toHaveBeenCalledTimes(1);
  });

  it('calls rollup api when given rollup data view', async () => {
    esClient.rollup.getRollupIndexCaps.mockResponse(
      rollupResponse as unknown as estypes.RollupGetRollupIndexCapsResponse
    );
    indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
    await indexPatterns.getFieldsForWildcard({
      pattern: patternList,
      type: DataViewType.ROLLUP,
      rollupIndex: 'foo',
    });
    expect(esClient.rollup.getRollupIndexCaps).toHaveBeenCalledTimes(1);
  });

  it("doesn't call rollup api when given rollup data view and rollups are disabled", async () => {
    esClient.rollup.getRollupIndexCaps.mockResponse(
      rollupResponse as unknown as estypes.RollupGetRollupIndexCapsResponse
    );
    indexPatterns = new IndexPatternsFetcher(esClient, {
      uiSettingsClient,
      allowNoIndices: true,
      rollupsEnabled: false,
    });
    await indexPatterns.getFieldsForWildcard({
      pattern: patternList,
      type: DataViewType.ROLLUP,
      rollupIndex: 'foo',
    });
    expect(esClient.rollup.getRollupIndexCaps).toHaveBeenCalledTimes(0);
  });

  describe('getExistingIndices', () => {
    test('getExistingIndices returns the valid matched indices', async () => {
      indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
      indexPatterns.getFieldsForWildcard = jest
        .fn()
        .mockResolvedValueOnce({ indices: ['length'] })
        .mockResolvedValue({ indices: [] });
      const result = await indexPatterns.getExistingIndices(['packetbeat-*', 'filebeat-*']);
      expect(indexPatterns.getFieldsForWildcard).toBeCalledTimes(2);
      expect(result.length).toBe(1);
    });

    test('getExistingIndices checks the positive pattern if provided with a negative pattern', async () => {
      indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
      const mockFn = jest.fn().mockResolvedValue({ indices: ['length'] });
      indexPatterns.getFieldsForWildcard = mockFn;
      const result = await indexPatterns.getExistingIndices(['-filebeat-*', 'filebeat-*']);
      expect(mockFn.mock.calls[0][0].pattern).toEqual('filebeat-*');
      expect(mockFn.mock.calls[1][0].pattern).toEqual('filebeat-*');
      expect(result).toEqual(['-filebeat-*', 'filebeat-*']);
    });

    test('getExistingIndices handles an error', async () => {
      indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
      indexPatterns.getFieldsForWildcard = jest
        .fn()
        .mockImplementationOnce(async () => {
          throw new DataViewMissingIndices('Catch me if you can!');
        })
        .mockImplementation(() => Promise.resolve({ indices: ['length'] }));
      const result = await indexPatterns.getExistingIndices(['packetbeat-*', 'filebeat-*']);
      expect(result).toEqual(['filebeat-*']);
    });
  });
});
