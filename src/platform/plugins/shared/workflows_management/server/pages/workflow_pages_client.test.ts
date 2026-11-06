/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createFakeStore, getStoredPage, pageDefinition, pageRef } from './fake_page_store.mock';
import { getWorkflowPageSavedObjectId, WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import type { WorkflowPageAuditLog, WorkflowPageKey, WorkflowPageOperation } from './types';
import { WorkflowPageNotFoundError } from './workflow_page_not_found_error';
import { WorkflowPagePrivilegesError } from './workflow_page_privileges_error';
import type { WorkflowPagesClient } from './workflow_pages_client';
import { WorkflowPagesClientImpl } from './workflow_pages_client';
import { WorkflowPagesSystemClientImpl } from './workflow_pages_system_client';
import { WorkflowPagesUnavailableError } from './workflow_pages_unavailable_error';

const ref = pageRef;
const key: WorkflowPageKey = { workflowId: ref.workflowId, pageId: ref.pageId };

const setup = async ({
  canEncrypt = true,
  deniedScoped = false,
  privileges = { readPage: true, managePage: true } as Record<WorkflowPageOperation, boolean>,
  withPage = true,
} = {}) => {
  const store = createFakeStore();
  const internalClient = store.createClient();
  const scopedClient = store.createClient('profile-alice', deniedScoped);
  const systemClient = new WorkflowPagesSystemClientImpl({
    logger: loggingSystemMock.createLogger(),
    canEncrypt: true,
    isEnabled: () => true,
    savedObjectsClient: internalClient,
  });
  if (withPage) {
    await systemClient.syncWorkflowPages({
      workflowId: ref.workflowId,
      spaceId: ref.spaceId,
      definition: pageDefinition(),
      valid: true,
    });
  }
  const audit: jest.Mocked<WorkflowPageAuditLog> = {
    logPageLinkRead: jest.fn(),
    logPageSecretRotated: jest.fn(),
    logPageAccessChanged: jest.fn(),
    logPageEnabledChanged: jest.fn(),
  };
  const assertWorkflowAccess = jest.fn(async () => {});
  const request: KibanaRequest = httpServerMock.createKibanaRequest();
  const client = new WorkflowPagesClientImpl({
    request,
    spaceId: ref.spaceId,
    privileges,
    canEncrypt,
    internalClient,
    scopedClient,
    encryptedClient: store.encryptedClient,
    assertWorkflowAccess,
    audit,
  });
  return {
    client,
    systemClient,
    store,
    scopedClient,
    audit,
    request,
    assertWorkflowAccess,
    storedPage: () => getStoredPage(store),
  };
};

describe('WorkflowPagesClient', () => {
  describe('operations', () => {
    it('returns a new page as offline, without an access level', async () => {
      const { client } = await setup();
      await expect(client.get(key)).resolves.toEqual(
        expect.objectContaining({ access: null, enabled: true, online: false })
      );
    });

    it('never exposes the secret or its hash in the page DTO', async () => {
      const { client } = await setup();
      const page = await client.get(key);
      expect(page).not.toHaveProperty('secret');
      expect(page).not.toHaveProperty('secretHash');
    });

    it('decrypts the link after the checks, and audits it', async () => {
      const { client, store, audit, request, storedPage, assertWorkflowAccess } = await setup();

      const secret = await client.getSecret(key);

      expect(secret).toBe(storedPage()?.attributes.secret);
      expect(assertWorkflowAccess.mock.invocationCallOrder[0]).toBeLessThan(
        store.encryptedClient.getDecryptedAsInternalUser.mock.invocationCallOrder[0]
      );
      expect(audit.logPageLinkRead).toHaveBeenCalledWith(request, ref);
    });

    it('rotates with every AAD attribute and the read version', async () => {
      const { client, scopedClient } = await setup();

      await client.rotateSecret(key);

      expect(scopedClient.update).toHaveBeenCalledWith(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        getWorkflowPageSavedObjectId(ref),
        expect.objectContaining({
          workflowId: ref.workflowId,
          pageId: ref.pageId,
          secret: expect.any(String),
          secretHash: expect.any(String),
        }),
        expect.objectContaining({ version: expect.any(String) })
      );
    });

    it('makes the old link fail right after a rotation', async () => {
      const { client, systemClient } = await setup();
      await client.setAccess(key, { level: 'secret_link' });
      const secret = await client.getSecret(key);

      const rotated = await client.rotateSecret(key);

      expect(rotated).not.toBe(secret);
      await expect(systemClient.verifyPageSecret(ref, secret)).resolves.toBe(false);
      await expect(systemClient.verifyPageSecret(ref, rotated)).resolves.toBe(true);
      await expect(client.getSecret(key)).resolves.toBe(rotated);
    });

    it('disables a page and enables it again', async () => {
      const { client, systemClient } = await setup();
      await client.setAccess(key, { level: 'secret_link' });
      const secret = await client.getSecret(key);

      await client.setEnabled(key, false);
      await expect(systemClient.verifyPageSecret(ref, secret)).resolves.toBe(false);

      await client.setEnabled(key, true);
      await expect(systemClient.verifyPageSecret(ref, secret)).resolves.toBe(true);
    });

    it('takes a page offline when the access level is removed', async () => {
      const { client } = await setup();
      await client.setAccess(key, { level: 'secret_link' });

      await expect(client.setAccess(key, null)).resolves.toEqual(
        expect.objectContaining({ access: null, online: false })
      );
    });

    it('records the acting user and audits rotation, access, and enabled changes', async () => {
      const { client, audit, request, storedPage } = await setup();

      await client.rotateSecret(key);
      const page = await client.setAccess(key, { level: 'secret_link' });
      await client.setEnabled(key, false);

      expect(page).toEqual(
        expect.objectContaining({ access: { level: 'secret_link' }, online: true })
      );
      expect(storedPage()?.updated_by).toBe('profile-alice');
      expect(audit.logPageSecretRotated).toHaveBeenCalledWith(request, ref);
      expect(audit.logPageAccessChanged).toHaveBeenCalledWith(request, {
        ...ref,
        access: { level: 'secret_link' },
        error: undefined,
      });
      expect(audit.logPageEnabledChanged).toHaveBeenCalledWith(request, {
        ...ref,
        enabled: false,
        error: undefined,
      });
    });

    it('does not create a page through an update', async () => {
      const { client, scopedClient } = await setup({ withPage: false });

      await expect(client.setEnabled(key, false)).rejects.toBeInstanceOf(WorkflowPageNotFoundError);
      expect(scopedClient.update).not.toHaveBeenCalled();
    });

    it('reports a missing page as not found', async () => {
      const { client } = await setup({ withPage: false });
      await expect(client.get(key)).rejects.toBeInstanceOf(WorkflowPageNotFoundError);
      await expect(client.getSecret(key)).rejects.toBeInstanceOf(WorkflowPageNotFoundError);
    });

    it('fails writes and audits the failure when saved object privileges deny the caller', async () => {
      const { client, audit, request } = await setup({ deniedScoped: true });

      await expect(client.setEnabled(key, false)).rejects.toThrow('forbidden');
      await expect(client.rotateSecret(key)).rejects.toThrow('forbidden');

      expect(audit.logPageEnabledChanged).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ error: expect.any(Error) })
      );
      expect(audit.logPageSecretRotated).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('refuses link and rotation without an encryption key', async () => {
      const { client } = await setup({ canEncrypt: false });
      await expect(client.getSecret(key)).rejects.toBeInstanceOf(WorkflowPagesUnavailableError);
      await expect(client.rotateSecret(key)).rejects.toBeInstanceOf(WorkflowPagesUnavailableError);
    });

    it('reports a page as offline without an encryption key, even with an access level', async () => {
      const { client } = await setup({ canEncrypt: false });
      await client.setAccess(key, { level: 'secret_link' });
      await expect(client.get(key)).resolves.toEqual(
        expect.objectContaining({ access: { level: 'secret_link' }, online: false })
      );
    });
  });

  describe('authorization', () => {
    const operations: Array<
      [string, WorkflowPageOperation, (client: WorkflowPagesClient) => Promise<unknown>]
    > = [
      ['get', 'readPage', (c) => c.get(key)],
      ['getSecret', 'readPage', (c) => c.getSecret(key)],
      ['rotateSecret', 'managePage', (c) => c.rotateSecret(key)],
      ['setAccess', 'managePage', (c) => c.setAccess(key, { level: 'secret_link' })],
      ['setEnabled', 'managePage', (c) => c.setEnabled(key, false)],
    ];

    it.each(operations)('%s fails without %s and touches no page', async (_, operation, run) => {
      const { client, store, scopedClient, assertWorkflowAccess } = await setup({
        privileges: { readPage: true, managePage: true, [operation]: false },
      });

      await expect(run(client)).rejects.toBeInstanceOf(WorkflowPagePrivilegesError);
      expect(assertWorkflowAccess).not.toHaveBeenCalled();
      expect(store.encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect(scopedClient.update).not.toHaveBeenCalled();
    });

    it.each(operations)('%s needs only %s', async (_, operation, run) => {
      const { client } = await setup({
        privileges: { readPage: false, managePage: false, [operation]: true },
      });
      await expect(run(client)).resolves.toBeDefined();
    });

    it.each(operations)('%s checks the workflow ACL for execute', async (_, __, run) => {
      const { client, request, assertWorkflowAccess } = await setup();

      await run(client);

      expect(assertWorkflowAccess).toHaveBeenCalledWith(
        { workflowId: ref.workflowId, spaceId: ref.spaceId },
        'execute',
        request
      );
    });

    it.each(operations)('%s fails when the workflow ACL denies the caller', async (_, __, run) => {
      const { client, store, scopedClient, assertWorkflowAccess } = await setup();
      assertWorkflowAccess.mockRejectedValue(new Error('acl denied'));

      await expect(run(client)).rejects.toThrow('acl denied');
      expect(store.encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect(scopedClient.update).not.toHaveBeenCalled();
    });

    it('audits a denied rotation', async () => {
      const { client, request, audit } = await setup({
        privileges: { readPage: true, managePage: false },
      });

      await expect(client.rotateSecret(key)).rejects.toThrow();
      expect(audit.logPageSecretRotated).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ error: expect.any(WorkflowPagePrivilegesError) })
      );
    });
  });
});
