/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import type { WorkflowPageAttributes } from './page_saved_object';
import { computePageSecretHash } from './page_secret';
import { getPageId, WorkflowPageStore } from './page_store';

const ref = { workflowId: 'report-incident', spaceId: 'marketing' };
const identity = { apiKey: 'a2V5', apiKeyId: 'key-1', runAsUsername: 'alice' };
const notFound = () =>
  SavedObjectsErrorHelpers.createGenericNotFoundError(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, 'id');

const setup = () => {
  const client = savedObjectsClientMock.create();
  const encryptedClient = encryptedSavedObjectsMock.createClient();
  const invalidateApiKey = jest.fn().mockResolvedValue(undefined);
  const store = new WorkflowPageStore({ client, encryptedClient, invalidateApiKey });
  return { client, encryptedClient, invalidateApiKey, store };
};

const storedPage = (attributes: Partial<WorkflowPageAttributes> & { secret: string }) => ({
  id: getPageId(ref),
  type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
  references: [],
  attributes: {
    workflowId: ref.workflowId,
    secretHash: computePageSecretHash({ ...ref, secret: attributes.secret }),
    enabled: true,
    createdAt: '2026-10-13T00:00:00.000Z',
    ...attributes,
  },
});

describe('getPageId', () => {
  it('maps one workflow in one space to one id', () => {
    expect(getPageId(ref)).toBe(getPageId({ ...ref }));
    expect(getPageId(ref)).not.toBe(getPageId({ ...ref, spaceId: 'default' }));
    expect(getPageId(ref)).not.toBe(getPageId({ ...ref, workflowId: 'other' }));
  });
});

describe('WorkflowPageStore', () => {
  it('returns the existing secret without creating a page', async () => {
    const { client, encryptedClient, store } = setup();
    encryptedClient.getDecryptedAsInternalUser.mockResolvedValue(storedPage({ secret: 'kept' }));

    await expect(store.getOrCreateSecret(ref)).resolves.toBe('kept');
    expect(client.create).not.toHaveBeenCalled();
  });

  it('creates a page in the space the first time', async () => {
    const { client, encryptedClient, store } = setup();
    encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(notFound());

    const secret = await store.getOrCreateSecret(ref);

    expect(client.create).toHaveBeenCalledWith(
      WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        workflowId: ref.workflowId,
        secret,
        secretHash: computePageSecretHash({ ...ref, secret }),
        enabled: true,
      }),
      { id: getPageId(ref), overwrite: false, namespace: 'marketing' }
    );
  });

  it('returns the page another request created at the same time', async () => {
    const { client, encryptedClient, store } = setup();
    encryptedClient.getDecryptedAsInternalUser
      .mockRejectedValueOnce(notFound())
      .mockResolvedValueOnce(storedPage({ secret: 'winner' }));
    client.create.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, 'id')
    );

    await expect(store.getOrCreateSecret(ref)).resolves.toBe('winner');
  });

  it('overwrites the secret on rotate and keeps the run identity', async () => {
    const { client, encryptedClient, store } = setup();
    encryptedClient.getDecryptedAsInternalUser.mockResolvedValue(
      storedPage({ secret: 'old', ...identity })
    );

    const secret = await store.rotate(ref);

    expect(secret).not.toBe('old');
    expect(client.create).toHaveBeenCalledWith(
      WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      expect.objectContaining({ secret, ...identity }),
      expect.objectContaining({ overwrite: true })
    );
  });

  it('keeps the URL and replaces the key of the previous saver', async () => {
    const { client, encryptedClient, invalidateApiKey, store } = setup();
    encryptedClient.getDecryptedAsInternalUser.mockResolvedValue(
      storedPage({ secret: 'kept', ...identity })
    );
    const next = { apiKey: 'bmV3', apiKeyId: 'key-2', runAsUsername: 'bob' };

    await store.setRunIdentity(ref, next);

    expect(client.create).toHaveBeenCalledWith(
      WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      expect.objectContaining({ secret: 'kept', ...next }),
      expect.objectContaining({ overwrite: true })
    );
    expect(invalidateApiKey).toHaveBeenCalledWith('key-1');
  });

  it('invalidates the new key when the page cannot be written', async () => {
    const { client, encryptedClient, invalidateApiKey, store } = setup();
    encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(notFound());
    client.create.mockRejectedValue(new Error('boom'));

    await expect(
      store.setRunIdentity(ref, { apiKey: 'bmV3', apiKeyId: 'key-2', runAsUsername: 'bob' })
    ).rejects.toThrow('boom');
    expect(invalidateApiKey).toHaveBeenCalledWith('key-2');
  });

  it('returns the run key decrypted and the run user without decrypting', async () => {
    const { client, encryptedClient, store } = setup();
    encryptedClient.getDecryptedAsInternalUser.mockResolvedValue(
      storedPage({ secret: 's', ...identity })
    );
    client.get.mockResolvedValue(storedPage({ secret: 's', runAsUsername: 'alice' }));

    await expect(store.getRunApiKey(ref)).resolves.toBe(identity.apiKey);
    await expect(store.getRunAsUsername(ref)).resolves.toBe('alice');
  });

  it('accepts only the stored secret of an enabled page', async () => {
    const { client, store } = setup();
    client.get.mockResolvedValue(storedPage({ secret: 'right' }));

    await expect(store.verify({ ...ref, secret: 'right' })).resolves.toBe(true);
    await expect(store.verify({ ...ref, secret: 'wrong' })).resolves.toBe(false);

    client.get.mockResolvedValue(storedPage({ secret: 'right', enabled: false }));
    await expect(store.verify({ ...ref, secret: 'right' })).resolves.toBe(false);
  });

  it('rejects a secret when the workflow has no page', async () => {
    const { client, store } = setup();
    client.get.mockRejectedValue(notFound());

    await expect(store.verify({ ...ref, secret: 'any' })).resolves.toBe(false);
  });

  it('deletes the page and invalidates its key on retire', async () => {
    const { client, invalidateApiKey, store } = setup();
    client.get.mockResolvedValue(storedPage({ secret: 's', ...identity }));

    await store.retire(ref);

    expect(client.delete).toHaveBeenCalledWith(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, getPageId(ref), {
      namespace: 'marketing',
    });
    expect(invalidateApiKey).toHaveBeenCalledWith('key-1');
  });

  it('ignores a missing page on retire', async () => {
    const { client, invalidateApiKey, store } = setup();
    client.get.mockRejectedValue(notFound());

    await expect(store.retire(ref)).resolves.toBeUndefined();
    expect(client.delete).not.toHaveBeenCalled();
    expect(invalidateApiKey).not.toHaveBeenCalled();
  });
});
