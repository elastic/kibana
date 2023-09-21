/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import type { ClusterDetails } from '@kbn/es-types';
import { ClusterView, getFailures } from './cluster_view';

const clusterDetailsWithShardFailure = {
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
} as ClusterDetails;

const clusterDetailsWhenClusterIsNotAvailable = {
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
} as ClusterDetails;

describe('getFailures', () => {
  test('should get failures from response with shard failures', () => {
    expect(getFailures(clusterDetailsWithShardFailure)).toEqual({
      clusterFailures: [],
      shardFailures: clusterDetailsWithShardFailure.failures,
    });
  });

  test('should get failures from response when cluster is not accessable', () => {
    expect(getFailures(clusterDetailsWhenClusterIsNotAvailable)).toEqual({
      clusterFailures: [clusterDetailsWhenClusterIsNotAvailable.failures[0]],
      shardFailures: [],
    });
  });

  test('should get failures from response when all shards fail', () => {
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
    };
    expect(getFailures(clusterDetails)).toEqual({
      clusterFailures: [clusterDetails.failures[0]],
      shardFailures: clusterDetails.failures[0].reason.failed_shards,
    });
  });
});

describe('render', () => {
  test('should show failures', () => {
    const wrapper = shallow(<ClusterView clusterDetails={clusterDetailsWithShardFailure} />);
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
    } as ClusterDetails;
    const wrapper = shallow(<ClusterView clusterDetails={clusterDetails} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('should display callout when cluster is skipped', () => {
    const wrapper = shallow(
      <ClusterView clusterDetails={clusterDetailsWhenClusterIsNotAvailable} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
