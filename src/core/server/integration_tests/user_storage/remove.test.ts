/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  type TestUtils,
} from '@kbn/core-test-helpers-kbn-server';
import {
  UserStorageClient,
  USER_STORAGE_SO_TYPE,
  USER_STORAGE_GLOBAL_SO_TYPE,
} from '@kbn/core-user-storage-server-internal';
import type { UserStorageDefinition, IUserStorageClient } from '@kbn/core-user-storage-common';

const PROFILE_UID = 'integration-test-profile-uid';

describe('UserStorage remove() / null-merge behavior', () => {
  jest.setTimeout(120_000);

  let servers: TestUtils;
  let esServer: TestElasticsearchUtils;
  let kbn: TestKibanaUtils;
  let savedObjectsClient: SavedObjectsClientContract;
  let userStorage: IUserStorageClient;

  beforeAll(async () => {
    servers = createTestServers({ adjustTimeout: (t) => jest.setTimeout(t) });
    esServer = await servers.startES();
    kbn = await servers.startKibana();

    const definitions = new Map<string, UserStorageDefinition>([
      ['test:string_a', { schema: z.string(), defaultValue: 'default_a', scope: 'space' }],
      ['test:string_b', { schema: z.string(), defaultValue: 'default_b', scope: 'space' }],
    ]);

    savedObjectsClient = kbn.coreStart.savedObjects.getScopedClient(
      httpServerMock.createKibanaRequest(),
      {
        includedHiddenTypes: [USER_STORAGE_SO_TYPE, USER_STORAGE_GLOBAL_SO_TYPE],
        excludedExtensions: [SECURITY_EXTENSION_ID],
      }
    );

    userStorage = new UserStorageClient({
      savedObjectsClient,
      profileUid: PROFILE_UID,
      definitions,
      logger: kbn.root.logger.get('user-storage-test'),
    });
  });

  afterAll(async () => {
    await esServer?.stop();
    await kbn?.stop();
  });

  beforeEach(async () => {
    // Reset state between tests by removing both keys
    await userStorage.remove('test:string_a');
    await userStorage.remove('test:string_b');
  });

  it('set() then remove() causes get() to return the default', async () => {
    await userStorage.set('test:string_a', 'custom_value');
    expect(await userStorage.get('test:string_a')).toBe('custom_value');

    await userStorage.remove('test:string_a');
    expect(await userStorage.get('test:string_a')).toBe('default_a');
  });

  it('remove() persists null in the underlying SO document', async () => {
    await userStorage.set('test:string_a', 'custom_value');
    await userStorage.remove('test:string_a');

    const doc = await savedObjectsClient.get<{ data: Record<string, unknown> }>(
      USER_STORAGE_SO_TYPE,
      PROFILE_UID
    );
    expect(doc.attributes.data).toHaveProperty('test:string_a', null);
  });

  it('set() after remove() overwrites the null with the new value', async () => {
    await userStorage.set('test:string_a', 'first');
    await userStorage.remove('test:string_a');
    await userStorage.set('test:string_a', 'second');

    expect(await userStorage.get('test:string_a')).toBe('second');
  });

  it('remove() of a never-set key does not throw', async () => {
    await expect(userStorage.remove('test:string_a')).resolves.not.toThrow();
  });

  it('remove() of one key does not affect a sibling key', async () => {
    await userStorage.set('test:string_a', 'value_a');
    await userStorage.set('test:string_b', 'value_b');

    await userStorage.remove('test:string_a');

    expect(await userStorage.get('test:string_a')).toBe('default_a');
    expect(await userStorage.get('test:string_b')).toBe('value_b');
  });

  it('getAll() treats null the same as undefined (returns default)', async () => {
    await userStorage.set('test:string_a', 'custom_value');
    await userStorage.remove('test:string_a');

    const all = await userStorage.getAll();
    expect(all['test:string_a']).toBe('default_a');
  });
});
