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

// Document ids produced by the client under each namespace.
const DEFAULT_SPACE_DOC_ID = `default:${PROFILE_UID}`;
const SECURITY_SPACE_DOC_ID = `security-space:${PROFILE_UID}`;

const buildClient = (
  definitions: Map<string, UserStorageDefinition>,
  namespace?: string | undefined
) => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const logger: MockedLogger = loggerMock.create();
  const client = new UserStorageClient({
    savedObjectsClient,
    profileUid: PROFILE_UID,
    namespace,
    definitions,
    logger,
  });
  return { client, savedObjectsClient, logger };
};

// ─── getForInjection ──────────────────────────────────────────────────────────

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
          id: DEFAULT_SPACE_DOC_ID,
          type: USER_STORAGE_SO_TYPE,
          references: [],
          attributes: {
            userId: PROFILE_UID,
            data: { 'space:a': 'hello', 'space:b': 'world' },
          },
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
          id: DEFAULT_SPACE_DOC_ID,
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
      { type: USER_STORAGE_SO_TYPE, id: DEFAULT_SPACE_DOC_ID },
      { type: USER_STORAGE_GLOBAL_SO_TYPE, id: PROFILE_UID },
    ]);
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(result).toEqual({ 'space:a': 'hello', 'global:b': 7 });
  });

  it('uses the namespaced id when the client is scoped to a non-default space', async () => {
    const definitions = new Map<string, UserStorageDefinition>([
      ['space:a', { schema: z.string(), defaultValue: 'a-default', scope: 'space', preload: true }],
    ]);
    const { client, savedObjectsClient } = buildClient(definitions, 'security-space');

    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: SECURITY_SPACE_DOC_ID,
          type: USER_STORAGE_SO_TYPE,
          references: [],
          attributes: { userId: PROFILE_UID, data: { 'space:a': 'hello' } },
        },
      ] as any,
    });

    await client.getForInjection();

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
      { type: USER_STORAGE_SO_TYPE, id: SECURITY_SPACE_DOC_ID },
    ]);
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
          id: DEFAULT_SPACE_DOC_ID,
          type: USER_STORAGE_SO_TYPE,
          references: [],
          attributes: { userId: PROFILE_UID, data: { 'space:a': 'hello' } },
        },
      ] as any,
    });

    await client.getForInjection();

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
      { type: USER_STORAGE_SO_TYPE, id: DEFAULT_SPACE_DOC_ID },
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
          id: DEFAULT_SPACE_DOC_ID,
          type: USER_STORAGE_SO_TYPE,
          references: [],
          attributes: {} as any,
          error: {
            error: 'Not Found',
            message: `Saved object [user-storage/${DEFAULT_SPACE_DOC_ID}] not found`,
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
          id: DEFAULT_SPACE_DOC_ID,
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

// ─── set() ────────────────────────────────────────────────────────────────────

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

  it('uses a namespaced document id for space-scoped keys', async () => {
    const { client, savedObjectsClient } = buildClient(spaceDefinitions(), 'security-space');
    savedObjectsClient.update.mockResolvedValue({} as any);

    await client.set('space:a', 'hello');

    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      USER_STORAGE_SO_TYPE,
      SECURITY_SPACE_DOC_ID,
      expect.any(Object)
    );
  });

  it('creates the document when it does not exist yet', async () => {
    const { client, savedObjectsClient } = buildClient(spaceDefinitions());
    savedObjectsClient.update.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        USER_STORAGE_SO_TYPE,
        DEFAULT_SPACE_DOC_ID
      )
    );
    savedObjectsClient.create.mockResolvedValue({} as any);

    const result = await client.set('space:a', 'hello');

    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      USER_STORAGE_SO_TYPE,
      { userId: PROFILE_UID, data: { 'space:a': 'hello' } },
      { id: DEFAULT_SPACE_DOC_ID }
    );
    expect(result).toBe('hello');
  });

  it('recovers from a same-space concurrent create by retrying the update', async () => {
    const { client, savedObjectsClient } = buildClient(spaceDefinitions());
    savedObjectsClient.update
      .mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          USER_STORAGE_SO_TYPE,
          DEFAULT_SPACE_DOC_ID
        )
      )
      .mockResolvedValueOnce({} as any);
    savedObjectsClient.create.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError(USER_STORAGE_SO_TYPE, DEFAULT_SPACE_DOC_ID)
    );

    const result = await client.set('space:a', 'hello');

    expect(savedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(result).toBe('hello');
  });

  it('succeeds in a second space because each space has its own document id', async () => {
    // Regression: previously this failed with a 500 because the globally-unique
    // profile_uid was used as the SO id, so a doc in one space conflicted with
    // create in another space, and the conflict retry-update then got a NotFound.
    // Now each space uses "{space}:{profile_uid}" so writes are fully independent.
    const { client: securityClient, savedObjectsClient: securitySo } = buildClient(
      spaceDefinitions(),
      'security-space'
    );
    // First write in the security space finds no document → creates one.
    securitySo.update.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        USER_STORAGE_SO_TYPE,
        SECURITY_SPACE_DOC_ID
      )
    );
    securitySo.create.mockResolvedValue({} as any);

    const result = await securityClient.set('space:a', 'hello');

    expect(result).toBe('hello');
    expect(securitySo.create).toHaveBeenCalledWith(
      USER_STORAGE_SO_TYPE,
      { userId: PROFILE_UID, data: { 'space:a': 'hello' } },
      { id: SECURITY_SPACE_DOC_ID }
    );
    // The security-space doc id must differ from the default-space one.
    expect(SECURITY_SPACE_DOC_ID).not.toBe(DEFAULT_SPACE_DOC_ID);
  });

  it('logs and rethrows unexpected errors from the initial update', async () => {
    const { client, savedObjectsClient, logger } = buildClient(spaceDefinitions());
    savedObjectsClient.update.mockRejectedValue(new Error('transport boom'));

    await expect(client.set('space:a', 'hello')).rejects.toThrow('transport boom');

    expect(savedObjectsClient.create).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
