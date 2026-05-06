/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME } from '../../common/environment_health';
import { buildEnvironmentHealthResponse } from './build_environment_health_response';
import type { ElasticsearchClient } from '@kbn/core/server';

function mockClient(handlers: {
  health?: () => Promise<unknown>;
  stats?: () => Promise<unknown>;
  getDataStream?: () => Promise<unknown>;
  count?: () => Promise<unknown>;
}): ElasticsearchClient {
  return {
    cluster: {
      health: jest.fn().mockImplementation(handlers.health ?? (() => Promise.resolve({}))),
      stats: jest.fn().mockImplementation(handlers.stats ?? (() => Promise.resolve({}))),
    },
    indices: {
      getDataStream: jest
        .fn()
        .mockImplementation(
          handlers.getDataStream ?? (() => Promise.resolve({ data_streams: [] }))
        ),
    },
    count: jest
      .fn()
      .mockImplementation(handlers.count ?? (() => Promise.resolve({ count: 0 }))),
  } as unknown as ElasticsearchClient;
}

describe('buildEnvironmentHealthResponse (prototype)', () => {
  it('merges health + stats + data streams + active rules when all succeed', async () => {
    const client = mockClient({
      health: async () => ({
        cluster_name: 'a',
        status: 'green',
        unassigned_shards: 0,
        timed_out: false,
      }),
      stats: async () => ({ cluster_name: 'a', indices: { count: 10 } }),
      getDataStream: async () => ({ data_streams: [{ name: 'x' }] }),
      count: async () => ({ count: 5 }),
    });

    const r = await buildEnvironmentHealthResponse(client);
    expect(r).toEqual({
      clusterName: 'a',
      healthStatus: 'green',
      indicesCount: 10,
      dataStreamsCount: 1,
      activeRulesCount: 5,
      attentionReasons: [],
    });
  });

  it('reports cluster_red in attentionReasons for red status', async () => {
    const client = mockClient({
      health: async () => ({
        cluster_name: 'a',
        status: 'red',
        unassigned_shards: 0,
        timed_out: false,
      }),
      stats: async () => ({ indices: { count: 1 } }),
    });

    const r = await buildEnvironmentHealthResponse(client);
    expect(r.attentionReasons).toContain('cluster_red');
    expect(r.healthStatus).toBe('red');
  });

  it('reports multiple reasons when applicable', async () => {
    const client = mockClient({
      health: async () => ({
        cluster_name: 'a',
        status: 'yellow',
        unassigned_shards: 3,
        timed_out: true,
      }),
    });

    const r = await buildEnvironmentHealthResponse(client);
    expect(r.attentionReasons).toEqual(
      expect.arrayContaining(['health_check_timed_out', 'cluster_yellow', 'unassigned_shards'])
    );
  });

  it('fills cluster name from stats if health fails', async () => {
    const client = mockClient({
      health: async () => Promise.reject(new Error('no')),
      stats: async () => ({ cluster_name: 'from-stats', indices: { count: 2 } }),
    });

    const r = await buildEnvironmentHealthResponse(client);
    expect(r.clusterName).toBe('from-stats');
    expect(r.indicesCount).toBe(2);
  });

  it('replaces the default ES cluster name with the landing display label', async () => {
    const client = mockClient({
      health: async () => ({
        cluster_name: 'elasticsearch',
        status: 'green',
        unassigned_shards: 0,
        timed_out: false,
      }),
      stats: async () => ({ cluster_name: 'elasticsearch', indices: { count: 2 } }),
    });

    const r = await buildEnvironmentHealthResponse(client);
    expect(r.clusterName).toBe(MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME);
  });

  it('omits activeRulesCount when count query rejects', async () => {
    const client = mockClient({
      health: async () => ({ cluster_name: 'a', status: 'green' }),
      count: async () => Promise.reject(new Error('index_not_found')),
    });

    const r = await buildEnvironmentHealthResponse(client);
    expect(r.activeRulesCount).toBeUndefined();
  });
});
