/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { IndexPatternsFetcher } from '.';
import { elasticsearchServiceMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
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

  it("works with index aliases - when rollup response doesn't have index as key", async () => {
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

  describe('getIndexPatternMatches', () => {
    describe('without negated index patterns', () => {
      test('returns the valid matched index patterns', async () => {
        indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
        indexPatterns.getFieldsForWildcard = jest
          .fn()
          .mockResolvedValueOnce({ indices: ['index1'] })
          .mockResolvedValue({ indices: [] });

        const result = await indexPatterns.getIndexPatternMatches(['packetbeat-*', 'filebeat-*']);

        expect(result.matchedIndexPatterns).toEqual(['packetbeat-*']);
      });

      test('returns the valid matched indices', async () => {
        indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
        indexPatterns.getFieldsForWildcard = jest
          .fn()
          .mockResolvedValueOnce({ indices: ['index1'] })
          .mockResolvedValue({ indices: [] });

        const result = await indexPatterns.getIndexPatternMatches(['packetbeat-*', 'filebeat-*']);

        expect(result.matchedIndices).toEqual(['index1']);
      });

      test('returns the valid matched indices per index pattern', async () => {
        indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
        indexPatterns.getFieldsForWildcard = jest
          .fn()
          .mockResolvedValueOnce({ indices: ['index1'] })
          .mockResolvedValue({ indices: ['index2'] });

        const result = await indexPatterns.getIndexPatternMatches(['packetbeat-*', 'filebeat-*']);

        expect(result.matchesByIndexPattern).toEqual({
          'packetbeat-*': ['index1'],
          'filebeat-*': ['index2'],
        });
      });
    });

    describe('with negated index patterns', () => {
      test('returns the valid matched index patterns', async () => {
        indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
        const mockFn = jest.fn().mockResolvedValue({ indices: ['index1'] });
        indexPatterns.getFieldsForWildcard = mockFn;

        const result = await indexPatterns.getIndexPatternMatches([
          '-filebeat-*',
          'filebeat-*',
          'logs-*',
          '-logs-excluded-*',
        ]);

        expect(result.matchedIndexPatterns).toEqual(['filebeat-*', 'logs-*']);
      });

      test('returns the valid matched indices', async () => {
        indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
        const mockFn = jest.fn().mockResolvedValue({ indices: ['index1'] });
        indexPatterns.getFieldsForWildcard = mockFn;

        const result = await indexPatterns.getIndexPatternMatches([
          '-filebeat-*',
          'filebeat-*',
          'logs-*',
          '-logs-excluded-*',
        ]);

        expect(result.matchedIndices).toEqual(['index1']);
      });

      test('returns the valid matched indices per index pattern', async () => {
        indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
        const mockFn = jest
          .fn()
          .mockResolvedValueOnce({ indices: ['index1'] })
          .mockResolvedValue({ indices: ['index2'] });
        indexPatterns.getFieldsForWildcard = mockFn;

        const result = await indexPatterns.getIndexPatternMatches([
          '-filebeat-*',
          'filebeat-*',
          'logs-*',
          '-logs-excluded-*',
        ]);

        expect(result.matchesByIndexPattern).toEqual({
          'filebeat-*': ['index1'],
          'logs-*': ['index2'],
        });
      });

      test('queries each positive pattern with all negated patterns for field caps', async () => {
        indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
        const mockFn = jest.fn().mockResolvedValue({ indices: ['length'] });
        indexPatterns.getFieldsForWildcard = mockFn;

        await indexPatterns.getIndexPatternMatches([
          '-filebeat-*',
          'filebeat-*',
          'logs-*',
          '-logs-excluded-*',
        ]);

        expect(mockFn.mock.calls[0][0].pattern).toEqual([
          'filebeat-*',
          '-filebeat-*',
          '-logs-excluded-*',
        ]);
        expect(mockFn.mock.calls[1][0].pattern).toEqual([
          'logs-*',
          '-filebeat-*',
          '-logs-excluded-*',
        ]);
      });
    });

    test('handles an error', async () => {
      indexPatterns = new IndexPatternsFetcher(esClient, optionalParams);
      indexPatterns.getFieldsForWildcard = jest
        .fn()
        .mockRejectedValueOnce(new DataViewMissingIndices('Catch me if you can!'))
        .mockResolvedValue({ indices: ['index1'] });

      const result = await indexPatterns.getIndexPatternMatches(['packetbeat-*', 'filebeat-*']);

      expect(result).toMatchObject({
        matchedIndexPatterns: ['filebeat-*'],
        matchedIndices: ['index1'],
        matchesByIndexPattern: {
          'packetbeat-*': [],
          'filebeat-*': ['index1'],
        },
      });
    });
  });
});
