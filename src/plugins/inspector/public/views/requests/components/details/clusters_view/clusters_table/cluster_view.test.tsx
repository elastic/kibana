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
import { ClusterView } from './cluster_view';

describe('render', () => {
  test('should show failures', () => {
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
    } as ClusterDetails;
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
    } as ClusterDetails;
    const wrapper = shallow(<ClusterView clusterDetails={clusterDetails} />);
    expect(wrapper).toMatchSnapshot();
  });
});
