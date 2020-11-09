/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
