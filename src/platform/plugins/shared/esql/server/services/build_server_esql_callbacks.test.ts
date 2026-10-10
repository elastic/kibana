/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { validateQuery } from '@kbn/esql-language';
import { loggerMock } from '@kbn/logging-mocks';
import { buildServerESQLCallbacks } from './build_server_esql_callbacks';
import { resetSourcesScopeCache } from './sources_scope';

const makeClient = (resolveIndex: jest.Mock, nodesInfo: jest.Mock) =>
  ({ indices: { resolveIndex }, nodes: { info: nodesInfo } } as unknown as ElasticsearchClient);

const logger = loggerMock.create();

const asScoped = (client: ElasticsearchClient) => ({
  asCurrentUser: client,
  asInternalUser: client,
});

const nodesInfoWithRoles = (roles: string[]) =>
  jest.fn().mockResolvedValue({ nodes: { node1: { roles } } });

const resolveIndexWith = (names: string[]) =>
  jest.fn().mockResolvedValue({ indices: names.map((name) => ({ name })) });

describe('buildServerESQLCallbacks.getSources', () => {
  beforeEach(() => {
    resetSourcesScopeCache();
  });

  it('includes remote sources when the node has the remote cluster client role', async () => {
    const resolveIndex = resolveIndexWith(['logs-test', 'remote:logs']);
    const nodesInfo = nodesInfoWithRoles(['data', 'master', 'remote_cluster_client']);
    const { getSources } = buildServerESQLCallbacks({
      esClient: asScoped(makeClient(resolveIndex, nodesInfo)),
      logger,
    });

    const sources = await getSources?.();

    expect(sources?.map(({ name }) => name)).toEqual(['logs-test', 'remote:logs']);
    expect(resolveIndex).toHaveBeenCalledWith(expect.objectContaining({ name: ['*', '*:*'] }));
  });

  it('uses local sources when the node lacks the remote cluster client role', async () => {
    const resolveIndex = resolveIndexWith(['logs-test']);
    const nodesInfo = nodesInfoWithRoles(['data', 'master', 'ingest']);
    const { getSources } = buildServerESQLCallbacks({
      esClient: asScoped(makeClient(resolveIndex, nodesInfo)),
      logger,
    });

    const sources = await getSources?.();

    expect(sources?.map(({ name }) => name)).toEqual(['logs-test']);
    expect(resolveIndex).toHaveBeenCalledTimes(2);
    expect(resolveIndex).toHaveBeenCalledWith(expect.objectContaining({ name: ['*'] }));
  });

  it('keeps remote sources when the role lookup fails', async () => {
    const resolveIndex = resolveIndexWith(['logs-test']);
    const nodesInfo = jest.fn().mockRejectedValue(new Error('unauthorized'));
    const { getSources } = buildServerESQLCallbacks({
      esClient: asScoped(makeClient(resolveIndex, nodesInfo)),
      logger,
    });

    await getSources?.();

    expect(resolveIndex).toHaveBeenCalledWith(expect.objectContaining({ name: ['*', '*:*'] }));
  });

  it('reads node roles with the internal client', async () => {
    const currentNodesInfo = jest.fn();
    const internalNodesInfo = nodesInfoWithRoles(['data']);
    const { getSources } = buildServerESQLCallbacks({
      esClient: {
        asCurrentUser: makeClient(resolveIndexWith([]), currentNodesInfo),
        asInternalUser: makeClient(jest.fn(), internalNodesInfo),
      },
      logger,
    });

    await getSources?.();

    expect(internalNodesInfo).toHaveBeenCalledWith({
      node_id: '_local',
      filter_path: 'nodes.*.roles',
    });
    expect(currentNodesInfo).not.toHaveBeenCalled();
  });

  it('caches the role lookup', async () => {
    const nodesInfo = nodesInfoWithRoles(['data']);
    const { getSources } = buildServerESQLCallbacks({
      esClient: asScoped(makeClient(resolveIndexWith([]), nodesInfo)),
      logger,
    });

    await getSources?.();
    await getSources?.();

    expect(nodesInfo).toHaveBeenCalledTimes(1);
  });

  it('reports remote sources as unknown when the node lacks the role', async () => {
    const callbacks = buildServerESQLCallbacks({
      esClient: asScoped(makeClient(resolveIndexWith(['logs-test']), nodesInfoWithRoles(['data']))),
      logger,
    });

    const { errors } = await validateQuery('FROM remote:logs | LIMIT 10', callbacks);

    expect(errors).toEqual([expect.objectContaining({ code: 'unknownDataSource' })]);
  });
});
