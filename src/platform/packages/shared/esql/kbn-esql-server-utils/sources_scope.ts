/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export type SourcesScope = 'all' | 'local';

let cache: { scope: SourcesScope; timestamp: number } | null = null;

export const resetSourcesScopeCache = (): void => {
  cache = null;
};

/**
 * Returns `local` when the node lacks the `remote_cluster_client` role, since `_resolve/index` rejects remote patterns there.
 */
export const getSourcesScope = async (
  client: ElasticsearchClient,
  logger: Logger
): Promise<SourcesScope> => {
  const now = Date.now();
  if (cache && now - cache.timestamp < 60 * 1000) {
    return cache.scope;
  }

  try {
    const { nodes } = await client.nodes.info({
      node_id: '_local',
      filter_path: 'nodes.*.roles',
    });
    const hasRole = Object.values(nodes).every((node) =>
      node.roles?.includes('remote_cluster_client')
    );
    const scope = hasRole ? 'all' : 'local';
    cache = { scope, timestamp: now };
    return scope;
  } catch (error) {
    logger.debug(`Failed to read node roles, using 'all' ES|QL sources scope: ${error.message}`);
    return 'all';
  }
};
