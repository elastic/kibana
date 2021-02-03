/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Client } from 'elasticsearch';
import { ILegacyScopedClusterClient } from './scoped_cluster_client';
import { ILegacyClusterClient, ILegacyCustomClusterClient } from './cluster_client';

const createScopedClusterClientMock = (): jest.Mocked<ILegacyScopedClusterClient> => ({
  callAsInternalUser: jest.fn(),
  callAsCurrentUser: jest.fn(),
});

const createCustomClusterClientMock = (): jest.Mocked<ILegacyCustomClusterClient> => ({
  ...createClusterClientMock(),
  close: jest.fn(),
});

function createClusterClientMock() {
  const client: jest.Mocked<ILegacyClusterClient> = {
    callAsInternalUser: jest.fn(),
    asScoped: jest.fn(),
  };
  client.asScoped.mockReturnValue(createScopedClusterClientMock());
  return client;
}

const createElasticsearchClientMock = () => {
  const mocked: jest.Mocked<Client> = {
    cat: {} as any,
    cluster: {} as any,
    indices: {} as any,
    ingest: {} as any,
    nodes: {} as any,
    snapshot: {} as any,
    tasks: {} as any,
    bulk: jest.fn(),
    clearScroll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteByQuery: jest.fn(),
    deleteScript: jest.fn(),
    deleteTemplate: jest.fn(),
    exists: jest.fn(),
    explain: jest.fn(),
    fieldStats: jest.fn(),
    get: jest.fn(),
    getScript: jest.fn(),
    getSource: jest.fn(),
    getTemplate: jest.fn(),
    index: jest.fn(),
    info: jest.fn(),
    mget: jest.fn(),
    msearch: jest.fn(),
    msearchTemplate: jest.fn(),
    mtermvectors: jest.fn(),
    ping: jest.fn(),
    putScript: jest.fn(),
    putTemplate: jest.fn(),
    reindex: jest.fn(),
    reindexRethrottle: jest.fn(),
    renderSearchTemplate: jest.fn(),
    scroll: jest.fn(),
    search: jest.fn(),
    searchShards: jest.fn(),
    searchTemplate: jest.fn(),
    suggest: jest.fn(),
    termvectors: jest.fn(),
    update: jest.fn(),
    updateByQuery: jest.fn(),
    close: jest.fn(),
  };
  return mocked;
};

export const legacyClientMock = {
  createScopedClusterClient: createScopedClusterClientMock,
  createCustomClusterClient: createCustomClusterClientMock,
  createClusterClient: createClusterClientMock,
  createElasticsearchClient: createElasticsearchClientMock,
};
