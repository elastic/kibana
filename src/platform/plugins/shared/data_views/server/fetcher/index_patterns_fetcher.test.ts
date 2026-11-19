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

  describe('getMatchedIndices', () => {
    const fields = {
      '@timestamp': { date: { type: 'date' }, unmapped: { type: 'unmapped', indices: ['index2'] } },
    };

    beforeEach(() => {
      esClient.fieldCaps.mockResponse({
        indices: ['index1', 'index2'],
        fields,
      } as unknown as estypes.FieldCapsResponse);
    });

    test('resolves all index patterns with one request', async () => {
      const result = await indexPatterns.getMatchedIndices({
        indexPatterns: ['packetbeat-*', 'filebeat-*'],
      });

      expect(result).toEqual({ matchedIndices: ['index1', 'index2'], fields });
      expect(esClient.fieldCaps).toHaveBeenCalledTimes(1);
      expect(esClient.fieldCaps).toHaveBeenCalledWith(
        expect.objectContaining({
          index: ['packetbeat-*', 'filebeat-*'],
          fields: ['_id'],
          allow_no_indices: true,
          ignore_unavailable: true,
          expand_wildcards: 'open',
        }),
        expect.anything()
      );
    });

    test('requests the given fields with unmapped indices and runtime mappings', async () => {
      const runtimeMappings = { 'event.ingested': { type: 'date' as const } };

      await indexPatterns.getMatchedIndices({
        indexPatterns: ['packetbeat-*'],
        fields: ['@timestamp', 'event.ingested'],
        includeUnmapped: true,
        runtimeMappings,
      });

      expect(esClient.fieldCaps).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: ['@timestamp', 'event.ingested'],
          include_unmapped: true,
          runtime_mappings: runtimeMappings,
        }),
        expect.anything()
      );
    });

    test('sends the index patterns in the given order, including the excluding ones', async () => {
      await indexPatterns.getMatchedIndices({
        indexPatterns: ['-filebeat-*', 'filebeat-*', 'logs-*', '-logs-excluded-*', 'metrics-*'],
      });

      expect(esClient.fieldCaps).toHaveBeenCalledWith(
        expect.objectContaining({
          index: ['-filebeat-*', 'filebeat-*', 'logs-*', '-logs-excluded-*', 'metrics-*'],
        }),
        expect.anything()
      );
    });

    test.each([
      ['no index patterns', []],
      ['only excluding index patterns', ['-filebeat-*']],
    ])('does not send a request for %s', async (_, patterns) => {
      const result = await indexPatterns.getMatchedIndices({ indexPatterns: patterns });

      expect(result).toEqual({ matchedIndices: [], fields: {} });
      expect(esClient.fieldCaps).not.toHaveBeenCalled();
    });

    test('returns no matched indices when nothing matches', async () => {
      esClient.fieldCaps.mockResponse({
        indices: [],
        fields: {},
      } as unknown as estypes.FieldCapsResponse);

      const result = await indexPatterns.getMatchedIndices({ indexPatterns: ['missing-*'] });

      expect(result).toEqual({ matchedIndices: [], fields: {} });
    });

    test('returns no matched indices for a closed index', async () => {
      esClient.fieldCaps.mockRejectedValue(new Error('index_closed_exception'));

      const result = await indexPatterns.getMatchedIndices({ indexPatterns: ['closed-index'] });

      expect(result).toEqual({ matchedIndices: [], fields: {} });
    });

    test('retries without the index patterns of a missing remote cluster', async () => {
      esClient.fieldCaps.mockRejectedValueOnce(
        Object.assign(new Error('no_such_remote_cluster_exception'), {
          body: {
            error: {
              root_cause: [
                {
                  type: 'no_such_remote_cluster_exception',
                  reason: 'no such remote cluster: [remote]',
                },
              ],
            },
          },
        })
      );

      const result = await indexPatterns.getMatchedIndices({
        indexPatterns: ['remote:logs-*', 'logs-*'],
      });

      expect(result.matchedIndices).toEqual(['index1', 'index2']);
      expect(esClient.fieldCaps).toHaveBeenCalledTimes(2);
      expect(esClient.fieldCaps).toHaveBeenLastCalledWith(
        expect.objectContaining({ index: ['logs-*'] }),
        expect.anything()
      );
    });

    test('returns no matched indices when every index pattern belongs to a missing remote cluster', async () => {
      esClient.fieldCaps.mockRejectedValue(
        Object.assign(new Error('no_such_remote_cluster_exception'), {
          body: {
            error: {
              root_cause: [
                {
                  type: 'no_such_remote_cluster_exception',
                  reason: 'no such remote cluster: [remote]',
                },
              ],
            },
          },
        })
      );

      const result = await indexPatterns.getMatchedIndices({ indexPatterns: ['remote:logs-*'] });

      expect(result).toEqual({ matchedIndices: [], fields: {} });
      expect(esClient.fieldCaps).toHaveBeenCalledTimes(1);
    });

    test('throws other errors', async () => {
      esClient.fieldCaps.mockRejectedValue(new Error('boom'));

      await expect(indexPatterns.getMatchedIndices({ indexPatterns: ['logs-*'] })).rejects.toThrow(
        'boom'
      );
    });
  });
});
