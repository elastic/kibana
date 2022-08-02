/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { merge, omit } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { getLocalStats, handleLocalStats } from './get_local_stats';
import {
  usageCollectionPluginMock,
  createCollectorFetchContextMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { StatsCollectionConfig } from '@kbn/telemetry-collection-manager-plugin/server';

function mockUsageCollection(kibanaUsage = {}) {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  usageCollection.bulkFetch = jest.fn().mockResolvedValue(kibanaUsage);
  usageCollection.toObject = jest.fn().mockImplementation((data) => data);
  return usageCollection;
}

// set up successful call mocks for info, cluster stats, nodes usage and data telemetry
function mockGetLocalStats<ClusterInfo, ClusterStats>(
  clusterInfo: ClusterInfo,
  clusterStats: ClusterStats
) {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  // @ts-expect-error we only care about the response body
  esClient.info.mockResponse({ ...clusterInfo });
  // @ts-expect-error we only care about the response body
  esClient.cluster.stats.mockResponse({ ...clusterStats });
  esClient.nodes.usage.mockResponse({
    cluster_name: 'testCluster',
    nodes: {
      some_node_id: {
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
          scripted_metric: {
            other: 7,
          },
          terms: {
            bytes: 2,
          },
        },
      },
    },
  });
  // @ts-expect-error we only care about the response body
  esClient.indices.getMapping.mockResponse({ mappings: {} });
  // @ts-expect-error we only care about the response body
  esClient.indices.stats.mockResponse({ indices: {} });
  return esClient;
}

function mockStatsCollectionConfig(
  clusterInfo: unknown,
  clusterStats: unknown,
  kibana: {}
): StatsCollectionConfig {
  return {
    ...createCollectorFetchContextMock(),
    esClient: mockGetLocalStats(clusterInfo, clusterStats),
    usageCollection: mockUsageCollection(kibana),
    refreshCache: false,
  };
}

describe('get_local_stats', () => {
  const clusterUuid = 'abc123';
  const clusterName = 'my-cool-cluster';
  const version = '2.3.4';
  const clusterInfo = {
    cluster_uuid: clusterUuid,
    cluster_name: clusterName,
    version: { number: version },
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
  } as unknown as estypes.ClusterStatsResponse;

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
    nodes: merge(clusterStats.nodes, { usage: { nodes: nodesUsage } }),
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
    it('returns expected object without xpack or kibana data', () => {
      const result = handleLocalStats(
        clusterInfo as estypes.InfoResponse,
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
        clusterInfo as estypes.InfoResponse,
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
      expect(Object.keys(cluster).indexOf('license')).toBeLessThan(0);
      expect(Object.keys(stack).indexOf('xpack')).toBeLessThan(0);
    });
  });

  describe('getLocalStats', () => {
    it('returns expected object with kibana data', async () => {
      const statsCollectionConfig = mockStatsCollectionConfig(clusterInfo, clusterStats, kibana);
      const response = await getLocalStats(
        [{ clusterUuid: 'abc123' }],
        statsCollectionConfig,
        context
      );
      const result = response[0];
      expect(result.cluster_uuid).toEqual(combinedStatsResult.cluster_uuid);
      expect(result.cluster_name).toEqual(combinedStatsResult.cluster_name);
      expect(result.cluster_stats).toEqual(combinedStatsResult.cluster_stats);
      expect(result.cluster_stats.nodes).toEqual(combinedStatsResult.cluster_stats.nodes);
      expect(result.version).toBe('2.3.4');
      expect(result.collection).toBe('local');
      expect(Object.keys(result).indexOf('license')).toBeLessThan(0);
      expect(Object.keys(result.stack_stats).indexOf('xpack')).toBeLessThan(0);
    });

    it('returns an empty array when no cluster uuid is provided', async () => {
      const statsCollectionConfig = mockStatsCollectionConfig(clusterInfo, clusterStats, kibana);
      const response = await getLocalStats([], statsCollectionConfig, context);
      expect(response).toBeDefined();
      expect(response.length).toEqual(0);
    });
  });
});
