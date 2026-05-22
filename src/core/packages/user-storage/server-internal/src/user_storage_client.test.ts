/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { UserStorageDefinition } from '@kbn/core-user-storage-common';
import { UserStorageClient } from './user_storage_client';
import { USER_STORAGE_SO_TYPE, USER_STORAGE_GLOBAL_SO_TYPE } from './saved_objects';

const PROFILE_UID = 'profile-uid';

const buildClient = (definitions: Map<string, UserStorageDefinition>) => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const logger: MockedLogger = loggerMock.create();
  const client = new UserStorageClient({
    savedObjectsClient,
    profileUid: PROFILE_UID,
    definitions,
    logger,
  });
  return { client, savedObjectsClient, logger };
};

describe('UserStorageClient.getAll()', () => {
  it('issues a single bulkGet covering both SO types when both scopes are registered', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space' }],
      ['global:b', { schema: z.number(), defaultValue: 0, scope: 'global' }],
    ]);
    const { client, savedObjectsClient } = buildClient(definitions);

    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: PROFILE_UID,
          type: USER_STORAGE_SO_TYPE,
          references: [],
          attributes: { userId: PROFILE_UID, data: { 'space:a': 'hello' } },
        },
        {
          id: PROFILE_UID,
          type: USER_STORAGE_GLOBAL_SO_TYPE,
          references: [],
          attributes: { userId: PROFILE_UID, data: { 'global:b': 7 } },
        },
      ] as any,
    });

    const result = await client.getAll();

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
      { type: USER_STORAGE_SO_TYPE, id: PROFILE_UID },
      { type: USER_STORAGE_GLOBAL_SO_TYPE, id: PROFILE_UID },
    ]);
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(result).toEqual({ 'space:a': 'hello', 'global:b': 7 });
  });

  it('only requests the registered scope when one scope is unused', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space' }],
    ]);
    const { client, savedObjectsClient } = buildClient(definitions);

    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: PROFILE_UID,
          type: USER_STORAGE_SO_TYPE,
          references: [],
          attributes: { userId: PROFILE_UID, data: { 'space:a': 'hello' } },
        },
      ] as any,
    });

    await client.getAll();

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
      { type: USER_STORAGE_SO_TYPE, id: PROFILE_UID },
    ]);
  });

  it('skips the SO request entirely when no definitions are registered', async () => {
    const { client, savedObjectsClient } = buildClient(new Map());

    const result = await client.getAll();

    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('returns defaults when bulkGet reports a missing doc via the error field', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space' }],
      ['global:b', { schema: z.number(), defaultValue: 42, scope: 'global' }],
    ]);
    const { client, savedObjectsClient } = buildClient(definitions);

    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: PROFILE_UID,
          type: USER_STORAGE_SO_TYPE,
          references: [],
          attributes: {} as any,
          error: {
            error: 'Not Found',
            message: 'Saved object [user-storage/profile-uid] not found',
            statusCode: 404,
          },
        },
        {
          id: PROFILE_UID,
          type: USER_STORAGE_GLOBAL_SO_TYPE,
          references: [],
          attributes: { userId: PROFILE_UID, data: { 'global:b': 99 } },
        },
      ] as any,
    });

    const result = await client.getAll();

    expect(result).toEqual({ 'space:a': 'a-default', 'global:b': 99 });
  });

  it('falls back to defaults and warns when a stored value fails schema validation', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space' }],
    ]);
    const { client, savedObjectsClient, logger } = buildClient(definitions);

    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: PROFILE_UID,
          type: USER_STORAGE_SO_TYPE,
          references: [],
          attributes: { userId: PROFILE_UID, data: { 'space:a': 123 } },
        },
      ] as any,
    });

    const result = await client.getAll();

    expect(result).toEqual({ 'space:a': 'a-default' });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatch(/space:a/);
  });

  it('propagates errors thrown by bulkGet itself (e.g. transport failure)', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space' }],
    ]);
    const { client, savedObjectsClient } = buildClient(definitions);

    savedObjectsClient.bulkGet.mockRejectedValue(new Error('boom'));

    await expect(client.getAll()).rejects.toThrow('boom');
  });
});
