/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { elasticsearchClientMock } from './mocks';
import { ScopedClusterClient } from './scoped_cluster_client';

describe('ScopedClusterClient', () => {
  it('uses the internal client passed in the constructor', () => {
    const internalClient = elasticsearchClientMock.createElasticsearchClient();
    const scopedClient = elasticsearchClientMock.createElasticsearchClient();

    const scopedClusterClient = new ScopedClusterClient(internalClient, scopedClient);

    expect(scopedClusterClient.asInternalUser).toBe(internalClient);
  });

  it('uses the scoped client passed in the constructor', () => {
    const internalClient = elasticsearchClientMock.createElasticsearchClient();
    const scopedClient = elasticsearchClientMock.createElasticsearchClient();

    const scopedClusterClient = new ScopedClusterClient(internalClient, scopedClient);

    expect(scopedClusterClient.asCurrentUser).toBe(scopedClient);
  });
});
