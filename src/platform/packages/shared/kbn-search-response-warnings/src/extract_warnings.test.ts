/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import type { ESQLSearchResponse } from '@kbn/es-types';
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

    it('should not include warnings when there is no _clusters or _shards information', () => {
      const warnings = extractWarnings(
        {
          took: 46,
          all_columns: [{ name: 'field1', type: 'string' }],
          columns: [{ name: 'field1', type: 'string' }],
          values: [['value1']],
        } as ESQLSearchResponse,
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

    describe('reachable remote with no matching index', () => {
      const emptyRemote: estypes.ClusterDetails = {
        status: 'skipped',
        indices: 'remote_empty:logs-myapp',
        took: 0,
        timed_out: false,
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
      };
      const successfulRemote: estypes.ClusterDetails = {
        status: 'successful',
        indices: 'remote_ok:logs-myapp',
        took: 3,
        timed_out: false,
        _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
      };
      const disconnectedRemote: estypes.ClusterDetails = {
        status: 'skipped',
        indices: 'remote_down:logs-myapp',
        took: 0,
        timed_out: false,
        failures: [
          {
            shard: -1,
            reason: { type: 'node_disconnected_exception', reason: 'Unable to connect to remote' },
          },
        ],
      };
      const partialRemote: estypes.ClusterDetails = {
        status: 'partial',
        indices: 'remote_partial:logs-myapp',
        took: 7,
        timed_out: false,
        _shards: { total: 2, successful: 1, skipped: 0, failed: 1 },
        failures: [
          {
            shard: 0,
            index: 'remote_partial:logs-myapp',
            reason: { type: 'query_shard_exception', reason: 'failed to create query' },
          },
        ],
      };

      const createCcsResponse = (
        details: Record<string, estypes.ClusterDetails>
      ): estypes.SearchResponse => {
        const countByStatus = (status: estypes.ClusterSearchStatus) =>
          Object.values(details).filter((cluster) => cluster.status === status).length;
        return {
          took: 5,
          timed_out: false,
          _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
          _clusters: {
            total: Object.keys(details).length,
            successful: countByStatus('successful'),
            skipped: countByStatus('skipped'),
            running: countByStatus('running'),
            partial: countByStatus('partial'),
            failed: countByStatus('failed'),
            details,
          },
          hits: { hits: [] },
        } as estypes.SearchResponse;
      };

      it('does not warn when the only skipped cluster has no matching index', () => {
        const warnings = extractWarnings(
          createCcsResponse({
            remote_ok: successfulRemote,
            remote_empty: emptyRemote,
          }),
          mockInspectorService,
          mockRequestAdapter,
          'My request'
        );

        expect(warnings).toEqual([]);
      });

      it('does not warn when the skipped cluster omits timed_out', () => {
        const { timed_out: _timedOut, ...withoutTimedOut } = emptyRemote;

        const warnings = extractWarnings(
          createCcsResponse({
            remote_empty: withoutTimedOut as estypes.ClusterDetails,
          }),
          mockInspectorService,
          mockRequestAdapter,
          'My request'
        );

        expect(warnings).toEqual([]);
      });

      it('treats an empty failures array as no failures', () => {
        const warnings = extractWarnings(
          createCcsResponse({
            remote_empty: { ...emptyRemote, failures: [] },
          }),
          mockInspectorService,
          mockRequestAdapter,
          'My request'
        );

        expect(warnings).toEqual([]);
      });

      it('warns about a skipped cluster that has failures and leaves out empty clusters', () => {
        const warnings = extractWarnings(
          createCcsResponse({
            remote_ok: successfulRemote,
            remote_empty: emptyRemote,
            remote_down: disconnectedRemote,
          }),
          mockInspectorService,
          mockRequestAdapter,
          'My request'
        );

        expect(warnings).toEqual([
          {
            type: 'incomplete',
            requestName: 'My request',
            clusters: { remote_ok: successfulRemote, remote_down: disconnectedRemote },
            openInInspector: expect.any(Function),
          },
        ]);
      });

      it('warns about a partial cluster and leaves out empty clusters', () => {
        const warnings = extractWarnings(
          createCcsResponse({
            remote_empty: emptyRemote,
            remote_partial: partialRemote,
          }),
          mockInspectorService,
          mockRequestAdapter,
          'My request'
        );

        expect(warnings).toEqual([
          {
            type: 'incomplete',
            requestName: 'My request',
            clusters: { remote_partial: partialRemote },
            openInInspector: expect.any(Function),
          },
        ]);
      });

      it('still warns about skipped clusters when there are no cluster details to inspect', () => {
        const response = {
          took: 5,
          timed_out: false,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          _clusters: {
            total: 2,
            successful: 1,
            skipped: 1,
            running: 0,
            partial: 0,
            failed: 0,
          },
          hits: { hits: [] },
        } as estypes.SearchResponse;

        const warnings = extractWarnings(
          response,
          mockInspectorService,
          mockRequestAdapter,
          'My request'
        );

        expect(warnings).toEqual([
          {
            type: 'incomplete',
            requestName: 'My request',
            clusters: {},
            openInInspector: expect.any(Function),
          },
        ]);
      });

      it('does not start warning when the only cluster counter is failed', () => {
        const response = {
          took: 5,
          timed_out: false,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          _clusters: {
            total: 1,
            successful: 0,
            skipped: 0,
            running: 0,
            partial: 0,
            failed: 1,
          },
          hits: { hits: [] },
        } as estypes.SearchResponse;

        expect(
          extractWarnings(response, mockInspectorService, mockRequestAdapter, 'My request')
        ).toEqual([]);
      });

      it('still warns about a failed cluster', () => {
        const failedRemote: estypes.ClusterDetails = {
          status: 'failed',
          indices: 'remote_failed:logs-myapp',
          took: 1,
          timed_out: false,
          failures: [
            {
              shard: -1,
              reason: { type: 'status_exception', reason: 'search failed' },
            },
          ],
        };

        const warnings = extractWarnings(
          createCcsResponse({
            remote_empty: emptyRemote,
            remote_failed: failedRemote,
          }),
          mockInspectorService,
          mockRequestAdapter,
          'My request'
        );

        expect(warnings).toEqual([
          {
            type: 'incomplete',
            requestName: 'My request',
            clusters: { remote_failed: failedRemote },
            openInInspector: expect.any(Function),
          },
        ]);
      });

      it('still warns when a skipped cluster times out', () => {
        const timedOutRemote: estypes.ClusterDetails = {
          ...emptyRemote,
          timed_out: true,
        };

        const warnings = extractWarnings(
          createCcsResponse({ remote_timeout: timedOutRemote }),
          mockInspectorService,
          mockRequestAdapter,
          'My request'
        );

        expect(warnings).toEqual([
          {
            type: 'incomplete',
            requestName: 'My request',
            clusters: { remote_timeout: timedOutRemote },
            openInInspector: expect.any(Function),
          },
        ]);
      });
    });
  });
});
