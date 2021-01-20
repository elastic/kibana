/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { migrationRetryCallClusterMock } from './migration_es_client.test.mock';

import { createMigrationEsClient, MigrationEsClient } from './migration_es_client';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { loggerMock } from '../../../logging/logger.mock';
import { SavedObjectsErrorHelpers } from '../../service/lib/errors';

describe('MigrationEsClient', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let migrationEsClient: MigrationEsClient;

  beforeEach(() => {
    client = elasticsearchClientMock.createElasticsearchClient();
    migrationEsClient = createMigrationEsClient(client, loggerMock.create());
    migrationRetryCallClusterMock.mockClear();
  });

  it('delegates call to ES client method', async () => {
    expect(migrationEsClient.bulk).toStrictEqual(expect.any(Function));
    await migrationEsClient.bulk({ body: [] });
    expect(client.bulk).toHaveBeenCalledTimes(1);
  });

  it('wraps a method call in migrationRetryCallClusterMock', async () => {
    await migrationEsClient.bulk({ body: [] });
    expect(migrationRetryCallClusterMock).toHaveBeenCalledTimes(1);
  });

  it('sets maxRetries: 0 to delegate retry logic to migrationRetryCallCluster', async () => {
    expect(migrationEsClient.bulk).toStrictEqual(expect.any(Function));
    await migrationEsClient.bulk({ body: [] });
    expect(client.bulk).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ maxRetries: 0 })
    );
  });

  it('do not transform elasticsearch errors into saved objects errors', async () => {
    expect.assertions(1);
    client.bulk = jest.fn().mockRejectedValue(new Error('reason'));
    try {
      await migrationEsClient.bulk({ body: [] });
    } catch (e) {
      expect(SavedObjectsErrorHelpers.isSavedObjectsClientError(e)).toBe(false);
    }
  });
});
