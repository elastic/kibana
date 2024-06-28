/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import type { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import { extractWarnings } from './extract_warnings';

const mockInspectorService = {} as InspectorStartContract;
const mockRequestAdapter = {} as RequestAdapter;

describe('extract search response warnings', () => {
  describe('single cluster', () => {
    it('should extract incomplete warning from response with shard failures', () => {
      const response = {
        took: 25,
        timed_out: false,
        _shards: {
          total: 4,
          successful: 3,
          skipped: 0,
          failed: 1,
          failures: [
            {
              shard: 0,
              index: 'sample-01-rollup',
              node: 'VFTFJxpHSdaoiGxJFLSExQ',
              reason: {
                type: 'illegal_argument_exception',
                reason:
                  'Field [kubernetes.container.memory.available.bytes] of type [aggregate_metric_double] is not supported for aggregation [percentiles]',
              },
            },
          ],
        },
        hits: { total: 18239, max_score: null, hits: [] },
        aggregations: {},
      };

      expect(
        extractWarnings(response, mockInspectorService, mockRequestAdapter, 'My request')
      ).toEqual([
        {
          type: 'incomplete',
          requestName: 'My request',
          clusters: {
            '(local)': {
              status: 'partial',
              indices: '',
              took: 25,
              timed_out: false,
              _shards: response._shards,
              failures: response._shards.failures,
            },
          },
          openInInspector: expect.any(Function),
        },
      ]);
    });

    it('should extract incomplete warning from response with time out', () => {
      const response = {
        took: 999,
        timed_out: true,
        _shards: {} as estypes.ShardStatistics,
        hits: { hits: [] },
      };
      expect(
        extractWarnings(response, mockInspectorService, mockRequestAdapter, 'My request')
      ).toEqual([
        {
          type: 'incomplete',
          requestName: 'My request',
          clusters: {
            '(local)': {
              status: 'partial',
              indices: '',
              took: 999,
              timed_out: true,
              _shards: response._shards,
              failures: response._shards.failures,
            },
          },
          openInInspector: expect.any(Function),
        },
      ]);
    });

    it('should not include warnings when there are none', () => {
      const warnings = extractWarnings(
        {
          timed_out: false,
          _shards: {
            failed: 0,
            total: 9000,
          },
        } as estypes.SearchResponse,
        mockInspectorService,
        mockRequestAdapter,
        'My request'
      );

      expect(warnings).toEqual([]);
    });
  });

  describe('remote clusters', () => {
    it('should extract incomplete warning from response with shard failures', () => {
      const response = {
        took: 25,
        timed_out: false,
        _shards: {
          total: 4,
          successful: 3,
          skipped: 0,
          failed: 1,
          failures: [
            {
              shard: 0,
              index: 'remote1:.ds-kibana_sample_data_logs-2023.08.21-000001',
              node: 'NVzFRd6SS4qT9o0k2vIzlg',
              reason: {
                type: 'query_shard_exception',
                reason:
                  'failed to create query: [.ds-kibana_sample_data_logs-2023.08.21-000001][0] local shard failure message 123',
                index_uuid: 'z1sPO8E4TdWcijNgsL_BxQ',
                index: 'remote1:.ds-kibana_sample_data_logs-2023.08.21-000001',
                caused_by: {
                  type: 'runtime_exception',
                  reason:
                    'runtime_exception: [.ds-kibana_sample_data_logs-2023.08.21-000001][0] local shard failure message 123',
                },
              },
            },
          ],
        },
        _clusters: {
          total: 2,
          partial: 1,
          successful: 1,
          skipped: 0,
          details: {
            '(local)': {
              status: 'successful',
              indices: 'kibana_sample_data_logs,kibana_sample_data_flights',
              took: 1,
              timed_out: false,
              _shards: {
                total: 2,
                successful: 2,
                skipped: 0,
                failed: 0,
              },
            },
            remote1: {
              status: 'partial',
              indices: 'kibana_sample_data_logs,kibana_sample_data_flights',
              took: 5,
              timed_out: false,
              _shards: {
                total: 2,
                successful: 1,
                skipped: 0,
                failed: 1,
              },
              failures: [
                {
                  shard: 0,
                  index: 'remote1:.ds-kibana_sample_data_logs-2023.08.21-000001',
                  node: 'NVzFRd6SS4qT9o0k2vIzlg',
                  reason: {
                    type: 'query_shard_exception',
                    reason:
                      'failed to create query: [.ds-kibana_sample_data_logs-2023.08.21-000001][0] local shard failure message 123',
                    index_uuid: 'z1sPO8E4TdWcijNgsL_BxQ',
                    index: 'remote1:.ds-kibana_sample_data_logs-2023.08.21-000001',
                    caused_by: {
                      type: 'runtime_exception',
                      reason:
                        'runtime_exception: [.ds-kibana_sample_data_logs-2023.08.21-000001][0] local shard failure message 123',
                    },
                  },
                },
              ],
            },
          },
        },
        hits: { total: 18239, max_score: null, hits: [] },
        aggregations: {},
      };

      expect(
        // @ts-expect-error missing new properties on clusters and clusters.details
        extractWarnings(response, mockInspectorService, mockRequestAdapter, 'My request')
      ).toEqual([
        {
          type: 'incomplete',
          requestName: 'My request',
          clusters: response._clusters.details,
          openInInspector: expect.any(Function),
        },
      ]);
    });

    it('should extract incomplete warning from response with time out', () => {
      const response = {
        took: 999,
        timed_out: true,
        _shards: {
          total: 6,
          successful: 6,
          skipped: 0,
          failed: 0,
        },
        _clusters: {
          total: 2,
          partial: 1,
          successful: 1,
          skipped: 0,
          details: {
            '(local)': {
              status: 'successful',
              indices:
                'kibana_sample_data_ecommerce,kibana_sample_data_logs,kibana_sample_data_flights',
              took: 0,
              timed_out: false,
              _shards: {
                total: 3,
                successful: 3,
                skipped: 0,
                failed: 0,
              },
            },
            remote1: {
              status: 'partial',
              indices: 'kibana_sample_data*',
              took: 10005,
              timed_out: true,
              _shards: {
                total: 3,
                successful: 3,
                skipped: 0,
                failed: 0,
              },
            },
          },
        },
        hits: { hits: [] },
      };
      expect(
        // @ts-expect-error missing new properties on clusters and clusters.details
        extractWarnings(response, mockInspectorService, mockRequestAdapter, 'My request')
      ).toEqual([
        {
          type: 'incomplete',
          requestName: 'My request',
          clusters: response._clusters.details,
          openInInspector: expect.any(Function),
        },
      ]);
    });

    it('should not include warnings when there are none', () => {
      const warnings = extractWarnings(
        // @ts-expect-error missing new properties on clusters and clusters.details
        {
          took: 10,
          timed_out: false,
          _shards: {
            total: 4,
            successful: 4,
            skipped: 0,
            failed: 0,
          },
          _clusters: {
            total: 2,
            successful: 2,
            skipped: 0,
            details: {
              '(local)': {
                status: 'successful',
                indices: 'kibana_sample_data_logs,kibana_sample_data_flights',
                took: 0,
                timed_out: false,
                _shards: {
                  total: 2,
                  successful: 2,
                  skipped: 0,
                  failed: 0,
                },
              },
              remote1: {
                status: 'successful',
                indices: 'kibana_sample_data_logs,kibana_sample_data_flights',
                took: 1,
                timed_out: false,
                _shards: {
                  total: 2,
                  successful: 2,
                  skipped: 0,
                  failed: 0,
                },
              },
            },
          },
          hits: { hits: [] },
        } as estypes.SearchResponse,
        mockInspectorService,
        mockRequestAdapter,
        'My request'
      );

      expect(warnings).toEqual([]);
    });
  });
});
