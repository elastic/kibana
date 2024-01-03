/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { getLocalClusterDetails } from './local_cluster';

describe('getLocalClusterDetails', () => {
  test('should convert local cluster SearchResponseBody into ClusterDetails', () => {
    expect(
      getLocalClusterDetails({
        took: 14,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 1,
          skipped: 0,
          failed: 1,
          failures: [
            {
              shard: 0,
              index: '.ds-kibana_sample_data_logs-2023.09.20-000001',
              node: 'tGUEVPsHR4uhEAdL0oANsA',
              reason: {
                type: 'query_shard_exception',
                reason:
                  'failed to create query: [.ds-kibana_sample_data_logs-2023.09.20-000001][0] local shard failure message 123',
                index_uuid: 'z31al9BiSk2prpzZED-hTA',
                index: '.ds-kibana_sample_data_logs-2023.09.20-000001',
                caused_by: {
                  type: 'runtime_exception',
                  reason:
                    '[.ds-kibana_sample_data_logs-2023.09.20-000001][0] local shard failure message 123',
                },
              },
            },
          ],
        },
      } as unknown as estypes.SearchResponse)
    ).toEqual({
      _shards: {
        failed: 1,
        skipped: 0,
        successful: 1,
        total: 2,
      },
      failures: [
        {
          index: '.ds-kibana_sample_data_logs-2023.09.20-000001',
          node: 'tGUEVPsHR4uhEAdL0oANsA',
          reason: {
            caused_by: {
              reason:
                '[.ds-kibana_sample_data_logs-2023.09.20-000001][0] local shard failure message 123',
              type: 'runtime_exception',
            },
            index: '.ds-kibana_sample_data_logs-2023.09.20-000001',
            index_uuid: 'z31al9BiSk2prpzZED-hTA',
            reason:
              'failed to create query: [.ds-kibana_sample_data_logs-2023.09.20-000001][0] local shard failure message 123',
            type: 'query_shard_exception',
          },
          shard: 0,
        },
      ],
      indices: '',
      status: 'partial',
      timed_out: false,
      took: 14,
    });
  });
});
