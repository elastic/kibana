/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { estypes } from '@elastic/elasticsearch';
import { shallow } from 'enzyme';
import { ClusterView } from './cluster_view';

describe('render', () => {
  test('should display success', () => {
    const clusterDetails = {
      status: 'successful',
      indices: 'kibana_sample_data*',
      took: 10005,
      timed_out: false,
      _shards: {
        total: 3,
        successful: 3,
        skipped: 0,
        failed: 0,
      },
    } as estypes.ClusterDetails;
    const wrapper = shallow(<ClusterView clusterDetails={clusterDetails} />);
    expect(wrapper).toMatchSnapshot();
  });

  describe('partial', () => {
    test('should show view shard failure button when there are shard failures', () => {
      const clusterDetails = {
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
      } as estypes.ClusterDetails;

      const wrapper = shallow(<ClusterView clusterDetails={clusterDetails} />);
      expect(wrapper).toMatchSnapshot();
    });

    test('should display callout when request timed out', () => {
      const clusterDetails = {
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
      } as estypes.ClusterDetails;
      const wrapper = shallow(<ClusterView clusterDetails={clusterDetails} />);
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('skipped or failed', () => {
    test('should display callout when cluster is unavailable', () => {
      const clusterDetails = {
        status: 'skipped',
        indices: 'kibana_sample_data*',
        timed_out: false,
        failures: [
          {
            shard: -1,
            index: null,
            reason: {
              type: 'no_such_remote_cluster_exception',
              reason: 'no such remote cluster: [remote1]',
            },
          },
        ],
      } as unknown as estypes.ClusterDetails;
      const wrapper = shallow(<ClusterView clusterDetails={clusterDetails} />);
      expect(wrapper).toMatchSnapshot();
    });

    test('should display callout with view failed shards button when all shards fail', () => {
      const clusterDetails = {
        status: 'skipped',
        indices: 'kibana_sample_data*',
        timed_out: false,
        failures: [
          {
            shard: -1,
            index: null,
            reason: {
              type: 'search_phase_execution_exception',
              reason: 'all shards failed',
              phase: 'query',
              grouped: true,
              failed_shards: [
                {
                  shard: 0,
                  index: 'remote1:.ds-kibana_sample_data_logs-2023.09.21-000001',
                  node: '_JVoOnN5QKidGGXFJAlgpA',
                  reason: {
                    type: 'query_shard_exception',
                    reason:
                      'failed to create query: [.ds-kibana_sample_data_logs-2023.09.21-000001][0] local shard failure message 123',
                    index_uuid: 'PAa7v-dKRIyo4kv6b8dxkQ',
                    index: 'remote1:.ds-kibana_sample_data_logs-2023.09.21-000001',
                    caused_by: {
                      type: 'runtime_exception',
                      reason:
                        'runtime_exception: [.ds-kibana_sample_data_logs-2023.09.21-000001][0] local shard failure message 123',
                    },
                  },
                },
              ],
              caused_by: {
                type: 'query_shard_exception',
                reason:
                  'failed to create query: [.ds-kibana_sample_data_logs-2023.09.21-000001][0] local shard failure message 123',
                index_uuid: 'PAa7v-dKRIyo4kv6b8dxkQ',
                index: 'remote1:.ds-kibana_sample_data_logs-2023.09.21-000001',
                caused_by: {
                  type: 'runtime_exception',
                  reason:
                    'runtime_exception: [.ds-kibana_sample_data_logs-2023.09.21-000001][0] local shard failure message 123',
                },
              },
            },
          },
        ],
      } as unknown as estypes.ClusterDetails;
      const wrapper = shallow(<ClusterView clusterDetails={clusterDetails} />);
      expect(wrapper).toMatchSnapshot();
    });
  });
});
