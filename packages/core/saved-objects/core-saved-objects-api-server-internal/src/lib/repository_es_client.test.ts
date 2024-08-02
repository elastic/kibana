/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { retryCallClusterMock } from './repository_es_client.test.mock';

import { createRepositoryEsClient, RepositoryEsClient } from './repository_es_client';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

describe('RepositoryEsClient', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repositoryClient: RepositoryEsClient;

  beforeEach(() => {
    client = elasticsearchClientMock.createElasticsearchClient();
    repositoryClient = createRepositoryEsClient(client);
    retryCallClusterMock.mockClear();
  });

  it('delegates call to ES client method', async () => {
    expect(repositoryClient.bulk).toStrictEqual(expect.any(Function));
    await repositoryClient.bulk({ body: [] });
    expect(client.bulk).toHaveBeenCalledTimes(1);
  });

  it('wraps a method call in retryCallCluster', async () => {
    await repositoryClient.bulk({ body: [] });
    expect(retryCallClusterMock).toHaveBeenCalledTimes(1);
  });

  it('keeps call options unchanged', async () => {
    expect(repositoryClient.bulk).toStrictEqual(expect.any(Function));
    const options = { maxRetries: 12 };
    await repositoryClient.bulk({ body: [] }, options);
    expect(client.bulk).toHaveBeenCalledWith(expect.any(Object), options);
  });

  it('transform elasticsearch errors into saved objects errors', async () => {
    expect.assertions(1);
    client.bulk.mockRejectedValue(new Error('reason'));
    try {
      await repositoryClient.bulk({ body: [] });
    } catch (e) {
      expect(SavedObjectsErrorHelpers.isSavedObjectsClientError(e)).toBe(true);
    }
  });
});
