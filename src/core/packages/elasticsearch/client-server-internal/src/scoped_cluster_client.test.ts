/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ScopedClusterClient } from './scoped_cluster_client';

const createEsClient = () => Symbol('client') as unknown as ElasticsearchClient;

describe('ScopedClusterClient', () => {
  it('uses the internal client passed in the constructor', () => {
    const internalClient = createEsClient();
    const scopedClient = createEsClient();
    const secondaryAuthClient = createEsClient();

    const scopedClusterClient = new ScopedClusterClient({
      asInternalUser: internalClient,
      asCurrentUserFactory: () => scopedClient,
      asSecondaryAuthUserFactory: () => secondaryAuthClient,
    });

    expect(scopedClusterClient.asInternalUser).toBe(internalClient);
  });

  it('uses the primary-auth scoped client factory passed in the constructor', () => {
    const internalClient = createEsClient();
    const scopedClient = createEsClient();
    const secondaryAuthClient = createEsClient();

    const scopedClusterClient = new ScopedClusterClient({
      asInternalUser: internalClient,
      asCurrentUserFactory: () => scopedClient,
      asSecondaryAuthUserFactory: () => secondaryAuthClient,
    });

    expect(scopedClusterClient.asCurrentUser).toBe(scopedClient);
  });

  it('uses the secondary-auth scoped client factory passed in the constructor', () => {
    const internalClient = createEsClient();
    const scopedClient = createEsClient();
    const secondaryAuthClient = createEsClient();

    const scopedClusterClient = new ScopedClusterClient({
      asInternalUser: internalClient,
      asCurrentUserFactory: () => scopedClient,
      asSecondaryAuthUserFactory: () => secondaryAuthClient,
    });

    expect(scopedClusterClient.asSecondaryAuthUser).toBe(secondaryAuthClient);
  });

  it('returns the same instance when calling `asCurrentUser` multiple times', () => {
    const internalClient = createEsClient();
    const scopedClient = createEsClient();
    const secondaryAuthClient = createEsClient();

    const scopedClusterClient = new ScopedClusterClient({
      asInternalUser: internalClient,
      asCurrentUserFactory: () => scopedClient,
      asSecondaryAuthUserFactory: () => secondaryAuthClient,
    });

    const userClient1 = scopedClusterClient.asCurrentUser;
    const userClient2 = scopedClusterClient.asCurrentUser;

    expect(userClient1).toBe(userClient2);
  });

  it('returns the same instance when calling `asSecondaryAuthUser` multiple times', () => {
    const internalClient = createEsClient();
    const scopedClient = createEsClient();
    const secondaryAuthClient = createEsClient();

    const scopedClusterClient = new ScopedClusterClient({
      asInternalUser: internalClient,
      asCurrentUserFactory: () => scopedClient,
      asSecondaryAuthUserFactory: () => secondaryAuthClient,
    });

    const secondaryAuth1 = scopedClusterClient.asSecondaryAuthUser;
    const secondaryAuth2 = scopedClusterClient.asSecondaryAuthUser;

    expect(secondaryAuth1).toBe(secondaryAuth2);
  });
});
