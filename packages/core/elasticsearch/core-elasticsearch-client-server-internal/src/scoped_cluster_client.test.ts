/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ScopedClusterClient } from './scoped_cluster_client';

const createEsClient = () => ({} as unknown as ElasticsearchClient);

describe('ScopedClusterClient', () => {
  it('uses the internal client passed in the constructor', () => {
    const internalClient = createEsClient();
    const scopedClient = createEsClient();

    const scopedClusterClient = new ScopedClusterClient(internalClient, scopedClient);

    expect(scopedClusterClient.asInternalUser).toBe(internalClient);
  });

  it('uses the scoped client passed in the constructor', () => {
    const internalClient = createEsClient();
    const scopedClient = createEsClient();

    const scopedClusterClient = new ScopedClusterClient(internalClient, scopedClient);

    expect(scopedClusterClient.asCurrentUser).toBe(scopedClient);
  });
});
