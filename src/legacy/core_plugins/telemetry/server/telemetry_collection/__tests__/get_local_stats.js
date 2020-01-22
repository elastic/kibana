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

import expect from '@kbn/expect';
import sinon from 'sinon';

import { mockGetClusterInfo } from './get_cluster_info';
import { mockGetClusterStats } from './get_cluster_stats';

import { omit } from 'lodash';
import { getLocalStats, handleLocalStats } from '../get_local_stats';

const mockUsageCollection = (kibanaUsage = {}) => ({
  bulkFetch: () => kibanaUsage,
  toObject: data => data,
});

const getMockServer = (getCluster = sinon.stub()) => ({
  log(tags, message) {
    console.log({ tags, message });
  },
  config() {
    return {
      get(item) {
        switch (item) {
          case 'pkg.version':
            return '8675309-snapshot';
          default:
            throw Error(`unexpected config.get('${item}') received.`);
        }
      },
    };
  },
  plugins: {
    elasticsearch: { getCluster },
  },
});

function mockGetLocalStats(callCluster, clusterInfo, clusterStats, req) {
  mockGetClusterInfo(callCluster, clusterInfo, req);
  mockGetClusterStats(callCluster, clusterStats, req);
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
    },
  };
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

  const combinedStatsResult = {
    collection: 'local',
    cluster_uuid: clusterUuid,
    cluster_name: clusterName,
    version,
    cluster_stats: omit(clusterStats, '_nodes', 'cluster_name'),
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

  describe('handleLocalStats', () => {
    it('returns expected object without xpack and kibana data', () => {
      const result = handleLocalStats(getMockServer(), clusterInfo, clusterStats);
      expect(result.cluster_uuid).to.eql(combinedStatsResult.cluster_uuid);
      expect(result.cluster_name).to.eql(combinedStatsResult.cluster_name);
      expect(result.cluster_stats).to.eql(combinedStatsResult.cluster_stats);
      expect(result.version).to.be('2.3.4');
      expect(result.collection).to.be('local');
      expect(result.license).to.be(undefined);
      expect(result.stack_stats).to.eql({ kibana: undefined });
    });

    it('returns expected object with xpack', () => {
      const result = handleLocalStats(getMockServer(), clusterInfo, clusterStats);
      const { stack_stats: stack, ...cluster } = result;
      expect(cluster.collection).to.be(combinedStatsResult.collection);
      expect(cluster.cluster_uuid).to.be(combinedStatsResult.cluster_uuid);
      expect(cluster.cluster_name).to.be(combinedStatsResult.cluster_name);
      expect(stack.kibana).to.be(undefined); // not mocked for this test

      expect(cluster.version).to.eql(combinedStatsResult.version);
      expect(cluster.cluster_stats).to.eql(combinedStatsResult.cluster_stats);
      expect(cluster.license).to.eql(combinedStatsResult.license);
      expect(stack.xpack).to.eql(combinedStatsResult.stack_stats.xpack);
    });
  });

  describe.skip('getLocalStats', () => {
    it('returns expected object without xpack data when X-Pack fails to respond', async () => {
      const callClusterUsageFailed = sinon.stub();
      const usageCollection = mockUsageCollection();
      mockGetLocalStats(
        callClusterUsageFailed,
        Promise.resolve(clusterInfo),
        Promise.resolve(clusterStats)
      );
      const result = await getLocalStats([], {
        server: getMockServer(),
        callCluster: callClusterUsageFailed,
        usageCollection,
      });
      expect(result.cluster_uuid).to.eql(combinedStatsResult.cluster_uuid);
      expect(result.cluster_name).to.eql(combinedStatsResult.cluster_name);
      expect(result.cluster_stats).to.eql(combinedStatsResult.cluster_stats);
      expect(result.version).to.be('2.3.4');
      expect(result.collection).to.be('local');

      // license and xpack usage info come from the same cluster call
      expect(result.license).to.be(undefined);
      expect(result.stack_stats.xpack).to.be(undefined);
    });

    it('returns expected object with xpack and kibana data', async () => {
      const callCluster = sinon.stub();
      const usageCollection = mockUsageCollection(kibana);
      mockGetLocalStats(callCluster, Promise.resolve(clusterInfo), Promise.resolve(clusterStats));

      const result = await getLocalStats([], {
        server: getMockServer(callCluster),
        usageCollection,
        callCluster,
      });

      expect(result.stack_stats.xpack).to.eql(combinedStatsResult.stack_stats.xpack);
      expect(result.stack_stats.kibana).to.eql(combinedStatsResult.stack_stats.kibana);
    });
  });
});
