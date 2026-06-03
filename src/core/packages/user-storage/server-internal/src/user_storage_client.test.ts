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
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
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

describe('UserStorageClient.getForInjection()', () => {
  it('returns empty object when no definitions have preload: true', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space' }],
    ]);
    const { client, savedObjectsClient } = buildClient(definitions);

    const result = await client.getForInjection();

    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('only includes keys with preload: true, skipping non-injectable keys', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space', preload: true }],
      ['space:b', { schema: z.string(), defaultValue: 'b-default', scope: 'space' }],
    ]);
    const { client, savedObjectsClient } = buildClient(definitions);

    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: PROFILE_UID,
          type: USER_STORAGE_SO_TYPE,
          references: [],
          attributes: { userId: PROFILE_UID, data: { 'space:a': 'hello', 'space:b': 'world' } },
        },
      ] as any,
    });

    const result = await client.getForInjection();

    expect(result).toEqual({ 'space:a': 'hello' });
  });

  it('issues a single bulkGet covering both SO types when injectable keys span both scopes', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space', preload: true }],
      ['global:b', { schema: z.number(), defaultValue: 0, scope: 'global', preload: true }],
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

    const result = await client.getForInjection();

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
      { type: USER_STORAGE_SO_TYPE, id: PROFILE_UID },
      { type: USER_STORAGE_GLOBAL_SO_TYPE, id: PROFILE_UID },
    ]);
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(result).toEqual({ 'space:a': 'hello', 'global:b': 7 });
  });

  it('only requests the scope(s) used by injectable keys', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space', preload: true }],
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
      ] as any,
    });

    await client.getForInjection();

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
      { type: USER_STORAGE_SO_TYPE, id: PROFILE_UID },
    ]);
  });

  it('returns defaults when bulkGet reports a missing doc via the error field', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space', preload: true }],
      ['global:b', { schema: z.number(), defaultValue: 42, scope: 'global', preload: true }],
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

    const result = await client.getForInjection();

    expect(result).toEqual({ 'space:a': 'a-default', 'global:b': 99 });
  });

  it('falls back to defaults and warns when a stored value fails schema validation', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space', preload: true }],
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

    const result = await client.getForInjection();

    expect(result).toEqual({ 'space:a': 'a-default' });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatch(/space:a/);
  });

  it('propagates errors thrown by bulkGet itself (e.g. transport failure)', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space', preload: true }],
    ]);
    const { client, savedObjectsClient } = buildClient(definitions);

    savedObjectsClient.bulkGet.mockRejectedValue(new Error('boom'));

    await expect(client.getForInjection()).rejects.toThrow('boom');
  });
});

describe('UserStorageClient.set()', () => {
  const spaceDefinitions = () =>
    new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string().trim(), defaultValue: '', scope: 'space' }],
    ]);

  it('returns the schema-validated value', async () => {
    const { client, savedObjectsClient } = buildClient(spaceDefinitions());
    savedObjectsClient.update.mockResolvedValue({} as any);

    const result = await client.set('space:a', '  hello  ');

    expect(result).toBe('hello');
  });

  it('creates the document when it does not exist yet', async () => {
    const { client, savedObjectsClient } = buildClient(spaceDefinitions());
    savedObjectsClient.update.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(USER_STORAGE_SO_TYPE, PROFILE_UID)
    );
    savedObjectsClient.create.mockResolvedValue({} as any);

    const result = await client.set('space:a', 'hello');

    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(result).toBe('hello');
  });

  it('recovers from a same-space concurrent create by retrying the update', async () => {
    const { client, savedObjectsClient } = buildClient(spaceDefinitions());
    savedObjectsClient.update
      .mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(USER_STORAGE_SO_TYPE, PROFILE_UID)
      )
      .mockResolvedValueOnce({} as any);
    savedObjectsClient.create.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError(USER_STORAGE_SO_TYPE, PROFILE_UID)
    );

    const result = await client.set('space:a', 'hello');

    expect(savedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(result).toBe('hello');
  });

  it('throws and logs an explicit error when the document is owned by another space', async () => {
    // Reproduces the cross-space failure: the user already has a (namespace-isolated,
    // globally-unique) document in a different space. update -> NotFound, create ->
    // Conflict (id exists elsewhere), retry update -> NotFound (not visible here).
    const { client, savedObjectsClient, logger } = buildClient(spaceDefinitions());
    savedObjectsClient.update.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(USER_STORAGE_SO_TYPE, PROFILE_UID)
    );
    savedObjectsClient.create.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError(USER_STORAGE_SO_TYPE, PROFILE_UID)
    );

    await expect(client.set('space:a', 'hello')).rejects.toThrowError();

    expect(savedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toMatch(/different space/);
  });

  it('logs and rethrows unexpected errors from the initial update', async () => {
    const { client, savedObjectsClient, logger } = buildClient(spaceDefinitions());
    savedObjectsClient.update.mockRejectedValue(new Error('transport boom'));

    await expect(client.set('space:a', 'hello')).rejects.toThrow('transport boom');

    expect(savedObjectsClient.create).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
