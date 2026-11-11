/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  createFakeStore,
  getStoredPage,
  noPageDefinition,
  pageDefinition,
  pageRef as ref,
  WORKFLOW_CREATED_AT,
} from './fake_page_store.mock';
import { computePageSecretHash } from './page_secret';
import { WorkflowPagesSystemClientImpl } from './workflow_pages_system_client';

const setup = ({ canEncrypt = true } = {}) => {
  const store = createFakeStore();
  const savedObjectsClient = store.createClient();
  const logger = loggingSystemMock.createLogger();
  const client = new WorkflowPagesSystemClientImpl({
    logger,
    canEncrypt,
    savedObjectsClient,
  });
  const sync = (
    definition: WorkflowYaml | null,
    overrides: Partial<typeof ref> & { workflowCreatedAt?: string } = {}
  ) =>
    client.syncWorkflowPages({
      workflowId: overrides.workflowId ?? ref.workflowId,
      workflowCreatedAt: overrides.workflowCreatedAt ?? WORKFLOW_CREATED_AT,
      spaceId: overrides.spaceId ?? ref.spaceId,
      definition,
      valid: true,
    });
  const storedPage = (pageRef = ref) => getStoredPage(store, pageRef);
  /** Puts a page online with a known secret, the way the request client would. */
  const putOnline = (secret: string) => {
    const page = storedPage();
    if (!page) throw new Error('no page');
    page.attributes = {
      ...page.attributes,
      secret,
      secretHash: computePageSecretHash(ref, secret),
      access: { level: 'secret_link' },
      enabled: true,
    };
  };
  return { client, store, savedObjectsClient, logger, sync, storedPage, putOnline };
};

describe('WorkflowPagesSystemClient', () => {
  describe('syncWorkflowPages', () => {
    it('creates an offline page without an access level on the first save with a page trigger', async () => {
      const { storedPage, sync } = setup();

      await sync(pageDefinition());

      expect(storedPage()?.attributes).toEqual(
        expect.objectContaining({
          workflowId: 'workflow-1',
          pageId: 'default',
          access: null,
          enabled: true,
        })
      );
    });

    it('keeps the secret when the workflow is saved again', async () => {
      const { storedPage, sync } = setup();
      await sync(pageDefinition());
      const { secret } = storedPage()?.attributes ?? {};

      await sync(pageDefinition());

      expect(storedPage()?.attributes.secret).toBe(secret);
    });

    it('retires the page when the trigger is removed, and makes a new secret when it is back', async () => {
      const { storedPage, sync } = setup();
      await sync(pageDefinition());
      const { secret } = storedPage()?.attributes ?? {};

      await sync(noPageDefinition);
      expect(storedPage()).toBeUndefined();

      await sync(pageDefinition());
      expect(storedPage()?.attributes.secret).toEqual(expect.any(String));
      expect(storedPage()?.attributes.secret).not.toBe(secret);
    });

    it('replaces the page when the trigger id changes', async () => {
      const { storedPage, sync } = setup();
      await sync(pageDefinition());

      await sync(pageDefinition('intake'));

      expect(storedPage()).toBeUndefined();
      expect(storedPage({ ...ref, pageId: 'intake' })).toBeDefined();
    });

    it('leaves the page alone when the saved definition is invalid', async () => {
      const { client, storedPage, sync } = setup();
      await sync(pageDefinition());

      await client.syncWorkflowPages({
        workflowId: ref.workflowId,
        workflowCreatedAt: WORKFLOW_CREATED_AT,
        spaceId: ref.spaceId,
        definition: null,
        valid: false,
      });

      expect(storedPage()).toBeDefined();
    });

    it('never gives a global workflow a page', async () => {
      const { savedObjectsClient, sync } = setup();
      await sync(pageDefinition(), { spaceId: '*' });
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('creates no page without an encryption key', async () => {
      const { savedObjectsClient, logger, sync } = setup({ canEncrypt: false });
      await sync(pageDefinition());
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('keeps the existing page when a concurrent save created it first', async () => {
      const { savedObjectsClient, storedPage, sync } = setup();
      await sync(pageDefinition());
      const { secret } = storedPage()?.attributes ?? {};
      savedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 1,
      });

      await sync(pageDefinition());

      expect(storedPage()?.attributes.secret).toBe(secret);
    });
  });

  describe('stale pages', () => {
    it('gives a recreated workflow with a reused id a new page, not the old secret', async () => {
      const { storedPage, sync } = setup();
      await sync(pageDefinition());
      const { secret } = storedPage()?.attributes ?? {};

      // The old workflow was force-deleted, its retire failed, and the id was reused.
      await sync(pageDefinition(), { workflowCreatedAt: '2026-02-01T00:00:00.000Z' });

      expect(storedPage()?.attributes).toEqual(
        expect.objectContaining({
          workflowCreatedAt: '2026-02-01T00:00:00.000Z',
          access: null,
        })
      );
      expect(storedPage()?.attributes.secret).not.toBe(secret);
    });

    it('retires a stale page even when the new workflow has no page trigger', async () => {
      const { storedPage, sync } = setup();
      await sync(pageDefinition());

      await sync(noPageDefinition, { workflowCreatedAt: '2026-02-01T00:00:00.000Z' });

      expect(storedPage()).toBeUndefined();
    });
  });

  describe('retireWorkflowPages', () => {
    it('searches 1,000 workflows per request', async () => {
      const { client, savedObjectsClient } = setup();
      const workflowIds = Array.from({ length: 2_001 }, (_, index) => `workflow-${index}`);

      await client.retireWorkflowPages({ workflowIds, spaceId: 'default' });

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(3);
    });

    it('retires every page of the given workflows', async () => {
      const { client, storedPage, sync } = setup();
      await sync(pageDefinition());
      await sync(pageDefinition(), { workflowId: 'workflow-2' });

      await client.retireWorkflowPages({
        workflowIds: ['workflow-1', 'workflow-2'],
        spaceId: 'default',
      });

      expect(storedPage()).toBeUndefined();
      expect(storedPage({ ...ref, workflowId: 'workflow-2' })).toBeUndefined();
    });

    it('does nothing for an empty list', async () => {
      const { client, savedObjectsClient } = setup();
      await client.retireWorkflowPages({ workflowIds: [], spaceId: 'default' });
      expect(savedObjectsClient.find).not.toHaveBeenCalled();
    });
  });

  describe('verifyPageSecret', () => {
    const onlinePage = async () => {
      const ctx = setup();
      await ctx.sync(pageDefinition());
      ctx.putOnline('the-secret');
      return ctx;
    };

    it('accepts the secret of an online page without a decrypt', async () => {
      const { client, store } = await onlinePage();
      await expect(client.verifyPageSecret(ref, 'the-secret', WORKFLOW_CREATED_AT)).resolves.toBe(
        true
      );
      expect(store.encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('rejects a wrong secret, another workflow, and another space', async () => {
      const { client } = await onlinePage();
      await expect(client.verifyPageSecret(ref, 'wrong', WORKFLOW_CREATED_AT)).resolves.toBe(false);
      await expect(
        client.verifyPageSecret(
          { ...ref, workflowId: 'workflow-2' },
          'the-secret',
          WORKFLOW_CREATED_AT
        )
      ).resolves.toBe(false);
      await expect(
        client.verifyPageSecret({ ...ref, spaceId: 'other' }, 'the-secret', WORKFLOW_CREATED_AT)
      ).resolves.toBe(false);
    });

    it('rejects the page of an earlier workflow with the same id', async () => {
      const { client } = await onlinePage();
      await expect(
        client.verifyPageSecret(ref, 'the-secret', '2026-02-01T00:00:00.000Z')
      ).resolves.toBe(false);
    });

    it('rejects a page without an access level', async () => {
      const { client, storedPage } = await onlinePage();
      const page = storedPage();
      if (page) page.attributes.access = null;
      await expect(client.verifyPageSecret(ref, 'the-secret', WORKFLOW_CREATED_AT)).resolves.toBe(
        false
      );
    });

    it('rejects a disabled page', async () => {
      const { client, storedPage } = await onlinePage();
      const page = storedPage();
      if (page) page.attributes.enabled = false;
      await expect(client.verifyPageSecret(ref, 'the-secret', WORKFLOW_CREATED_AT)).resolves.toBe(
        false
      );
    });

    it('rejects every secret without an encryption key', async () => {
      const { client } = setup({ canEncrypt: false });
      await expect(client.verifyPageSecret(ref, 'anything', WORKFLOW_CREATED_AT)).resolves.toBe(
        false
      );
    });
  });
});
