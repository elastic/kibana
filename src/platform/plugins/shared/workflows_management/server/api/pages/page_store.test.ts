/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import type { WorkflowPageAttributes } from './page_saved_object';
import { computePageSecretHash } from './page_secret';
import { getPageId, WorkflowPageStore } from './page_store';

const ref = { workflowId: 'report-incident', spaceId: 'marketing' };
const notFound = () =>
  SavedObjectsErrorHelpers.createGenericNotFoundError(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, 'id');

const setup = () => {
  const repository = savedObjectsRepositoryMock.create();
  const encryptedClient = encryptedSavedObjectsMock.createClient();
  const store = new WorkflowPageStore({ repository, encryptedClient });
  return { repository, encryptedClient, store };
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
    const { repository, encryptedClient, store } = setup();
    encryptedClient.getDecryptedAsInternalUser.mockResolvedValue(storedPage({ secret: 'kept' }));

    await expect(store.getOrCreateSecret(ref)).resolves.toBe('kept');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates a page in the space the first time', async () => {
    const { repository, encryptedClient, store } = setup();
    encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(notFound());

    const secret = await store.getOrCreateSecret(ref);

    expect(repository.create).toHaveBeenCalledWith(
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
    const { repository, encryptedClient, store } = setup();
    encryptedClient.getDecryptedAsInternalUser
      .mockRejectedValueOnce(notFound())
      .mockResolvedValueOnce(storedPage({ secret: 'winner' }));
    repository.create.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, 'id')
    );

    await expect(store.getOrCreateSecret(ref)).resolves.toBe('winner');
  });

  it('overwrites the secret on rotate', async () => {
    const { repository, store } = setup();

    const secret = await store.rotate(ref);

    expect(repository.create).toHaveBeenCalledWith(
      WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      expect.objectContaining({ secret }),
      expect.objectContaining({ overwrite: true })
    );
  });

  it('accepts only the stored secret of an enabled page', async () => {
    const { repository, store } = setup();
    repository.get.mockResolvedValue(storedPage({ secret: 'right' }));

    await expect(store.verify({ ...ref, secret: 'right' })).resolves.toBe(true);
    await expect(store.verify({ ...ref, secret: 'wrong' })).resolves.toBe(false);

    repository.get.mockResolvedValue(storedPage({ secret: 'right', enabled: false }));
    await expect(store.verify({ ...ref, secret: 'right' })).resolves.toBe(false);
  });

  it('rejects a secret when the workflow has no page', async () => {
    const { repository, store } = setup();
    repository.get.mockRejectedValue(notFound());

    await expect(store.verify({ ...ref, secret: 'any' })).resolves.toBe(false);
  });

  it('ignores a missing page on retire', async () => {
    const { repository, store } = setup();
    repository.delete.mockRejectedValue(notFound());

    await expect(store.retire(ref)).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith(
      WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      getPageId(ref),
      { namespace: 'marketing' }
    );
  });
});
