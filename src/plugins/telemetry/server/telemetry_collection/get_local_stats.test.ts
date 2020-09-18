/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// import expect from '@kbn/expect';
// import sinon from 'sinon';
import { merge, omit, get } from 'lodash';

import { mockGetClusterInfo } from './get_cluster_info.test';
import { mockGetClusterStats } from './get_cluster_stats.test';
import { getLocalStats, handleLocalStats } from './get_local_stats';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';

const mockUsageCollection = (kibanaUsage = {}) => ({
  bulkFetch: () => kibanaUsage,
  toObject: (data: any) => data,
});

// const getMockServer = (getCluster = sinon.stub()) => ({
//   log(tags, message) {
//     // eslint-disable-next-line no-console
//     console.log({ tags, message });
//   },
//   config() {
//     return {
//       get(item) {
//         switch (item) {
//           case 'pkg.version':
//             return '8675309-snapshot';
//           default:
//             throw Error(`unexpected config.get('${item}') received.`);
//         }
//       },
//     };
//   },
//   plugins: {
//     elasticsearch: { getCluster },
//   },
// });
function mockGetNodesUsage(nodesUsage: any) {
  const response = Promise.resolve({ body: nodesUsage });
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  esClient.nodes.usage.mockImplementationOnce(
    // @ts-ignore
    async (_params = { metric: '_all', timeout: TIMEOUT }) => {
      return response;
    }
  );
  return esClient;
}

function mockGetLocalStats(clusterInfo: any, clusterStats: any, nodesUsage: any) {
  mockGetClusterInfo(clusterInfo);
  mockGetClusterStats(clusterStats);
  mockGetNodesUsage(nodesUsage);
}

describe('get_local_stats', () => {
  const clusterUuid = 'abc123';
  const clusterName = 'my-cool-cluster';
  const version = '2.3.4';
  const clusterInfo = {
    cluster_uuid: clusterUuid,
    cluster_name: clusterName,
    version: {
      number: version,
      build_flavor: 'string',
      build_type: 'string',
      build_hash: 'string',
      build_date: 'string',
      build_snapshot: false,
      lucene_version: 'string',
      minimum_wire_compatibility_version: 'string',
      minimum_index_compatibility_version: 'string',
    },
  };
  const nodesUsage = [
    {
      node_id: 'some_node_id',
      timestamp: 1588617023177,
      since: 1588616945163,
      rest_actions: {
        nodes_usage_action: 1,
        create_index_action: 1,
        document_get_action: 1,
        search_action: 19,
        nodes_info_action: 36,
      },
      aggregations: {
        terms: {
          bytes: 2,
        },
        scripted_metric: {
          other: 7,
        },
      },
    },
  ];
  const clusterStats = {
    _nodes: { failed: 123 },
    cluster_name: 'real-cool',
    indices: { totally: 456 },
    nodes: { yup: 'abc' },
    random: 123,
  };

  const kibana = {
    kibana: {
      great: 'googlymoogly',
      versions: [{ version: '8675309', count: 1 }],
    },
    kibana_stats: {
      os: {
        platform: 'rocky',
        platformRelease: 'iv',
      },
    },
    localization: {
      locale: 'en',
      labelsCount: 0,
      integrities: {},
    },
    sun: { chances: 5 },
    clouds: { chances: 95 },
    rain: { chances: 2 },
    snow: { chances: 0 },
  };

  const clusterStatsWithNodesUsage = {
    ...clusterStats,
    nodes: merge(clusterStats.nodes, { usage: nodesUsage }),
  };

  const combinedStatsResult = {
    collection: 'local',
    cluster_uuid: clusterUuid,
    cluster_name: clusterName,
    version,
    cluster_stats: omit(clusterStatsWithNodesUsage, '_nodes', 'cluster_name'),
    stack_stats: {
      kibana: {
        great: 'googlymoogly',
        count: 1,
        indices: 1,
        os: {
          platforms: [{ platform: 'rocky', count: 1 }],
          platformReleases: [{ platformRelease: 'iv', count: 1 }],
        },
        versions: [{ version: '8675309', count: 1 }],
        plugins: {
          localization: {
            locale: 'en',
            labelsCount: 0,
            integrities: {},
          },
          sun: { chances: 5 },
          clouds: { chances: 95 },
          rain: { chances: 2 },
          snow: { chances: 0 },
        },
      },
    },
  };

  const context = {
    logger: console,
    version: '8.0.0',
  };

  describe('handleLocalStats', () => {
    it('returns expected object without xpack and kibana data', () => {
      const result = handleLocalStats(
        clusterInfo,
        clusterStatsWithNodesUsage,
        void 0,
        void 0,
        context
      );
      expect(result.cluster_uuid).toStrictEqual(combinedStatsResult.cluster_uuid);
      expect(result.cluster_name).toStrictEqual(combinedStatsResult.cluster_name);
      expect(result.cluster_stats).toStrictEqual(combinedStatsResult.cluster_stats);
      expect(result.version).toEqual('2.3.4');
      expect(result.collection).toEqual('local');
      expect(Object.keys(result)).not.toContain('license');
      expect(result.stack_stats).toEqual({ kibana: undefined, data: undefined });
    });

    it('returns expected object with xpack', () => {
      const result = handleLocalStats(
        clusterInfo,
        clusterStatsWithNodesUsage,
        void 0,
        void 0,
        context
      );

      const { stack_stats: stack, ...cluster } = result;
      expect(cluster.collection).toBe(combinedStatsResult.collection);
      expect(cluster.cluster_uuid).toBe(combinedStatsResult.cluster_uuid);
      expect(cluster.cluster_name).toBe(combinedStatsResult.cluster_name);
      expect(stack.kibana).toBe(undefined); // not mocked for this test
      expect(stack.data).toBe(undefined); // not mocked for this test

      expect(cluster.version).toEqual(combinedStatsResult.version);
      expect(cluster.cluster_stats).toEqual(combinedStatsResult.cluster_stats);
      expect(get(cluster, 'license', '')).toEqual(get(combinedStatsResult, 'license', ''));
      expect(get(stack, 'xpack', '')).toEqual(
        get(combinedStatsResult, ['stack_stats', 'xpack'], '')
      );
    });
  });

  // describe.skip('getLocalStats', () => {
  //   it('returns expected object without xpack data when X-Pack fails to respond', async () => {
  //     const callClusterUsageFailed = sinon.stub();
  //     const usageCollection = mockUsageCollection();
  //     mockGetLocalStats(
  //       callClusterUsageFailed,
  //       Promise.resolve(clusterInfo),
  //       Promise.resolve(clusterStats),
  //       Promise.resolve(nodesUsage)
  //     );
  //     const result = await getLocalStats([], {
  //       server: getMockServer(),
  //       callCluster: callClusterUsageFailed,
  //       usageCollection,
  //     });
  //     expect(result.cluster_uuid).to.eql(combinedStatsResult.cluster_uuid);
  //     expect(result.cluster_name).to.eql(combinedStatsResult.cluster_name);
  //     expect(result.cluster_stats).to.eql(combinedStatsResult.cluster_stats);
  //     expect(result.cluster_stats.nodes).to.eql(combinedStatsResult.cluster_stats.nodes);
  //     expect(result.version).to.be('2.3.4');
  //     expect(result.collection).to.be('local');

  //     // license and xpack usage info come from the same cluster call
  //     expect(result.license).to.be(undefined);
  //     expect(result.stack_stats.xpack).to.be(undefined);
  //   });

  //   it('returns expected object with xpack and kibana data', async () => {
  //     const callCluster = sinon.stub();
  //     const usageCollection = mockUsageCollection(kibana);
  //     mockGetLocalStats(
  //       callCluster,
  //       Promise.resolve(clusterInfo),
  //       Promise.resolve(clusterStats),
  //       Promise.resolve(nodesUsage)
  //     );

  //     const result = await getLocalStats([], {
  //       server: getMockServer(callCluster),
  //       usageCollection,
  //       callCluster,
  //     });

  //     expect(result.stack_stats.xpack).to.eql(combinedStatsResult.stack_stats.xpack);
  //     expect(result.stack_stats.kibana).to.eql(combinedStatsResult.stack_stats.kibana);
  //   });
  // });
});
