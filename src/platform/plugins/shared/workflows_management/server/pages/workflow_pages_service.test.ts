/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowPageAttributes } from './page_saved_object';
import { getWorkflowPageSavedObjectId, WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import { WorkflowPageNotFoundError } from './workflow_page_not_found_error';
import { WorkflowPagePrivilegesError } from './workflow_page_privileges_error';
import type { WorkflowPageAuditLog } from './workflow_pages_service';
import { WorkflowPagesService } from './workflow_pages_service';
import { WorkflowPagesUnavailableError } from './workflow_pages_unavailable_error';

type StoredPage = SavedObject<WorkflowPageAttributes> & { namespace?: string };

/**
 * An in-memory store with the saved objects behavior the service relies on:
 * namespaces, `overwrite: false` conflicts, `version` checks, and `updated_by`.
 */
const createFakeStore = () => {
  const docs = new Map<string, StoredPage>();
  let versionCounter = 0;
  const nextVersion = () => `v${++versionCounter}`;
  const key = (id: string, namespace?: string) => `${namespace ?? 'default'}:${id}`;
  const notFound = (id: string) =>
    SavedObjectsErrorHelpers.createGenericNotFoundError(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, id);
  // The standard client strips encrypted attributes.
  const strip = ({ attributes, namespace, ...rest }: StoredPage) => {
    const { secret, ...visible } = attributes;
    return { ...rest, attributes: visible as WorkflowPageAttributes };
  };

  const createClient = (user?: string, denied = false) =>
    ({
      get: jest.fn(async (_type: string, id: string, options?: { namespace?: string }) => {
        if (denied) throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error('forbidden'));
        const doc = docs.get(key(id, options?.namespace));
        if (!doc) throw notFound(id);
        return strip(doc);
      }),
      create: jest.fn(
        async (
          type: string,
          attributes: WorkflowPageAttributes,
          options: { id: string; namespace?: string; overwrite?: boolean }
        ) => {
          if (denied) throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error('forbidden'));
          const k = key(options.id, options.namespace);
          if (docs.has(k) && !options.overwrite) {
            throw SavedObjectsErrorHelpers.createConflictError(type, options.id);
          }
          const now = new Date().toISOString();
          const doc: StoredPage = {
            id: options.id,
            type,
            attributes,
            references: [],
            namespace: options.namespace,
            version: nextVersion(),
            created_at: now,
            created_by: user,
            updated_at: now,
            updated_by: user,
          };
          docs.set(k, doc);
          return strip(doc);
        }
      ),
      update: jest.fn(
        async (
          _type: string,
          id: string,
          attributes: Partial<WorkflowPageAttributes>,
          options?: { namespace?: string; version?: string }
        ) => {
          if (denied) throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error('forbidden'));
          const k = key(id, options?.namespace);
          const doc = docs.get(k);
          if (!doc) throw notFound(id);
          if (options?.version && options.version !== doc.version) {
            throw SavedObjectsErrorHelpers.createConflictError(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, id);
          }
          docs.set(k, {
            ...doc,
            attributes: { ...doc.attributes, ...attributes },
            version: nextVersion(),
            updated_by: user,
          });
          return { id, type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE, attributes, references: [] };
        }
      ),
      bulkDelete: jest.fn(
        async (objects: Array<{ id: string }>, options?: { namespace?: string }) => ({
          statuses: objects.map(({ id }) => {
            const existed = docs.delete(key(id, options?.namespace));
            return existed
              ? { id, type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE, success: true }
              : {
                  id,
                  type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
                  success: false,
                  error: { error: 'Not Found', message: 'Not found', statusCode: 404 },
                };
          }),
        })
      ),
      createPointInTimeFinder: jest.fn((options: { namespaces: string[]; filter: unknown }) => {
        const filterText = JSON.stringify(options.filter);
        const matches = [...docs.values()].filter(
          (doc) =>
            (doc.namespace ?? 'default') === options.namespaces[0] &&
            filterText.includes(`"${doc.attributes.workflowId}"`)
        );
        return {
          find: async function* find() {
            yield { saved_objects: matches.map(strip), total: matches.length };
          },
          close: jest.fn(async () => {}),
        };
      }),
    } as unknown as jest.Mocked<SavedObjectsClientContract>);

  const encryptedClient = {
    getDecryptedAsInternalUser: jest.fn(
      async (_type: string, id: string, options?: { namespace?: string }) => {
        const doc = docs.get(key(id, options?.namespace));
        if (!doc) throw notFound(id);
        return { ...doc };
      }
    ),
  } as unknown as jest.Mocked<EncryptedSavedObjectsClient>;

  return { docs, createClient, encryptedClient, key };
};

const pageDefinition = (pageId?: string) =>
  ({
    triggers: [{ type: 'page', title: 'Report', ...(pageId ? { id: pageId } : {}) }],
    steps: [],
  } as unknown as WorkflowYaml);

const noPageDefinition = {
  triggers: [{ type: 'manual' }],
  steps: [],
} as unknown as WorkflowYaml;

const ref = { workflowId: 'workflow-1', spaceId: 'default', pageId: 'default' };

const setup = ({
  canEncrypt = true,
  enabled = true,
  deniedScoped = false,
  grantedActions = [
    WorkflowsManagementApiActions.execute,
    WorkflowsManagementApiActions.managePages,
  ],
} = {}) => {
  const store = createFakeStore();
  const internalClient = store.createClient();
  const scopedClient = store.createClient('profile-alice', deniedScoped);
  const audit: jest.Mocked<WorkflowPageAuditLog> = {
    logPageLinkRead: jest.fn(),
    logPageSecretRotated: jest.fn(),
    logPageAccessChanged: jest.fn(),
    logPageOfflineChanged: jest.fn(),
  };
  const logger = loggingSystemMock.createLogger();
  const request: KibanaRequest = httpServerMock.createKibanaRequest();
  const hasPrivileges = jest.fn(
    async (_request: KibanaRequest, _spaceId: string, actions: readonly string[]) =>
      actions.every((action) => (grantedActions as string[]).includes(action))
  );
  const assertWorkflowAccess = jest.fn(async () => {});
  const service = new WorkflowPagesService({
    logger,
    canEncrypt,
    getInternalClient: async () => internalClient,
    getScopedClient: async () => scopedClient,
    getEncryptedClient: async () => store.encryptedClient,
    isEnabled: async () => enabled,
    audit,
    hasPrivileges,
    assertWorkflowAccess,
  });
  const storedPage = (pageRef = ref) =>
    store.docs.get(store.key(getWorkflowPageSavedObjectId(pageRef), undefined));
  const sync = (definition: WorkflowYaml | null, overrides: Partial<typeof ref> = {}) =>
    service.syncWorkflowPages({
      workflowId: overrides.workflowId ?? ref.workflowId,
      spaceId: overrides.spaceId ?? ref.spaceId,
      definition,
      valid: true,
    });
  return {
    service,
    store,
    internalClient,
    scopedClient,
    audit,
    logger,
    request,
    storedPage,
    sync,
    hasPrivileges,
    assertWorkflowAccess,
  };
};

describe('WorkflowPagesService', () => {
  describe('lifecycle', () => {
    it('creates an offline page without an access level on the first save with a page trigger', async () => {
      const { service, storedPage, sync, request } = setup();

      await sync(pageDefinition());

      expect(storedPage()?.attributes).toEqual(
        expect.objectContaining({ workflowId: 'workflow-1', pageId: 'default', access: null })
      );
      await expect(service.getPage(ref, request)).resolves.toEqual(
        expect.objectContaining({ access: null, online: false })
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
      const { service, storedPage, sync } = setup();
      await sync(pageDefinition());

      await service.syncWorkflowPages({
        workflowId: ref.workflowId,
        spaceId: ref.spaceId,
        definition: null,
        valid: false,
      });

      expect(storedPage()).toBeDefined();
    });

    it('never gives a global workflow a page', async () => {
      const { internalClient, sync } = setup();
      await sync(pageDefinition(), { spaceId: '*' });
      expect(internalClient.create).not.toHaveBeenCalled();
    });

    it('does nothing while the feature flag is off', async () => {
      const { internalClient, sync } = setup({ enabled: false });
      await sync(pageDefinition());
      expect(internalClient.createPointInTimeFinder).not.toHaveBeenCalled();
      expect(internalClient.create).not.toHaveBeenCalled();
    });

    it('creates no page without an encryption key', async () => {
      const { internalClient, logger, sync } = setup({ canEncrypt: false });
      await sync(pageDefinition());
      expect(internalClient.create).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('keeps the existing page when a concurrent save created it first', async () => {
      const { internalClient, storedPage, sync } = setup();
      await sync(pageDefinition());
      const { secret } = storedPage()?.attributes ?? {};
      internalClient.createPointInTimeFinder.mockReturnValueOnce({
        find: async function* find() {
          yield { saved_objects: [], total: 0, per_page: 100, page: 1 };
        },
        close: jest.fn(async () => {}),
      });

      await sync(pageDefinition());

      expect(storedPage()?.attributes.secret).toBe(secret);
    });

    it('retires every page of deleted workflows', async () => {
      const { service, storedPage, sync } = setup();
      await sync(pageDefinition());
      await sync(pageDefinition(), { workflowId: 'workflow-2' });

      await service.retireWorkflowPages({
        workflowIds: ['workflow-1', 'workflow-2'],
        spaceId: 'default',
      });

      expect(storedPage()).toBeUndefined();
      expect(storedPage({ ...ref, workflowId: 'workflow-2' })).toBeUndefined();
    });
  });

  describe('verifyPageSecret', () => {
    const onlinePage = async () => {
      const ctx = setup();
      await ctx.sync(pageDefinition());
      await ctx.service.setPageAccess(ref, { level: 'secret_link' }, ctx.request);
      const secret = await ctx.service.getPageSecret(ref, ctx.request);
      return { ...ctx, secret };
    };

    it('accepts the secret of an online page without a decrypt', async () => {
      const { service, store, secret } = await onlinePage();
      store.encryptedClient.getDecryptedAsInternalUser.mockClear();

      await expect(service.verifyPageSecret(ref, secret)).resolves.toBe(true);
      expect(store.encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('rejects a wrong secret, a missing page, and another workflow', async () => {
      const { service, secret } = await onlinePage();
      await expect(service.verifyPageSecret(ref, 'wrong')).resolves.toBe(false);
      await expect(
        service.verifyPageSecret({ ...ref, workflowId: 'workflow-2' }, secret)
      ).resolves.toBe(false);
      await expect(service.verifyPageSecret({ ...ref, spaceId: 'other' }, secret)).resolves.toBe(
        false
      );
    });

    it('rejects a page without an access level', async () => {
      const { service, request, secret } = await onlinePage();
      await service.setPageAccess(ref, null, request);
      await expect(service.verifyPageSecret(ref, secret)).resolves.toBe(false);
    });

    it('rejects an offline page, and accepts it again when it is back online', async () => {
      const { service, request, secret } = await onlinePage();
      await service.setPageOffline(ref, true, request);
      await expect(service.verifyPageSecret(ref, secret)).resolves.toBe(false);

      await service.setPageOffline(ref, false, request);
      await expect(service.verifyPageSecret(ref, secret)).resolves.toBe(true);
    });

    it('rejects the old secret right after a rotation', async () => {
      const { service, request, secret } = await onlinePage();

      const rotated = await service.rotatePageSecret(ref, request);

      expect(rotated).not.toBe(secret);
      await expect(service.verifyPageSecret(ref, secret)).resolves.toBe(false);
      await expect(service.verifyPageSecret(ref, rotated)).resolves.toBe(true);
      await expect(service.getPageSecret(ref, request)).resolves.toBe(rotated);
    });

    it('rejects every secret without an encryption key', async () => {
      const { service } = setup({ canEncrypt: false });
      await expect(service.verifyPageSecret(ref, 'anything')).resolves.toBe(false);
    });
  });

  describe('page operations', () => {
    it('decrypts the link after the checks, and audits it', async () => {
      const {
        service,
        store,
        audit,
        request,
        storedPage,
        sync,
        hasPrivileges,
        assertWorkflowAccess,
      } = setup();
      await sync(pageDefinition());

      const secret = await service.getPageSecret(ref, request);

      expect(secret).toBe(storedPage()?.attributes.secret);
      expect(hasPrivileges.mock.invocationCallOrder[0]).toBeLessThan(
        store.encryptedClient.getDecryptedAsInternalUser.mock.invocationCallOrder[0]
      );
      expect(assertWorkflowAccess.mock.invocationCallOrder[0]).toBeLessThan(
        store.encryptedClient.getDecryptedAsInternalUser.mock.invocationCallOrder[0]
      );
      expect(audit.logPageLinkRead).toHaveBeenCalledWith(request, ref);
    });

    it('rotates with every AAD attribute and the read version', async () => {
      const { service, scopedClient, request, sync } = setup();
      await sync(pageDefinition());

      await service.rotatePageSecret(ref, request);

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

    it('records the acting user and audits rotation, access, and offline changes', async () => {
      const { service, audit, request, storedPage, sync } = setup();
      await sync(pageDefinition());

      await service.rotatePageSecret(ref, request);
      const page = await service.setPageAccess(ref, { level: 'secret_link' }, request);
      await service.setPageOffline(ref, true, request);

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
      expect(audit.logPageOfflineChanged).toHaveBeenCalledWith(request, {
        ...ref,
        offline: true,
        error: undefined,
      });
    });

    it('never exposes the secret or its hash in the page DTO', async () => {
      const { service, request, sync } = setup();
      await sync(pageDefinition());

      const page = await service.getPage(ref, request);

      expect(page).not.toHaveProperty('secret');
      expect(page).not.toHaveProperty('secretHash');
    });

    it('does not create a page through an update', async () => {
      const { service, scopedClient, request } = setup();

      await expect(service.setPageOffline(ref, true, request)).rejects.toBeInstanceOf(
        WorkflowPageNotFoundError
      );
      expect(scopedClient.update).not.toHaveBeenCalled();
    });

    it('fails writes and audits the failure when the saved object privileges deny the caller', async () => {
      const { service, internalClient, audit, request } = setup({ deniedScoped: true });
      await service.syncWorkflowPages({
        workflowId: ref.workflowId,
        spaceId: ref.spaceId,
        definition: pageDefinition(),
        valid: true,
      });

      await expect(service.setPageOffline(ref, true, request)).rejects.toThrow('forbidden');
      await expect(service.rotatePageSecret(ref, request)).rejects.toThrow('forbidden');

      expect(internalClient.update).not.toHaveBeenCalled();
      expect(audit.logPageOfflineChanged).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ error: expect.any(Error) })
      );
      expect(audit.logPageSecretRotated).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('reports a missing page as not found', async () => {
      const { service, request } = setup();
      await expect(service.getPage(ref, request)).rejects.toBeInstanceOf(WorkflowPageNotFoundError);
      await expect(service.getPageSecret(ref, request)).rejects.toBeInstanceOf(
        WorkflowPageNotFoundError
      );
    });

    it('refuses link and rotation without an encryption key', async () => {
      const { service, request } = setup({ canEncrypt: false });
      await expect(service.getPageSecret(ref, request)).rejects.toBeInstanceOf(
        WorkflowPagesUnavailableError
      );
      await expect(service.rotatePageSecret(ref, request)).rejects.toBeInstanceOf(
        WorkflowPagesUnavailableError
      );
    });

    it('reports a page as offline without an encryption key, even with an access level', async () => {
      const ctx = setup();
      await ctx.sync(pageDefinition());
      await ctx.service.setPageAccess(ref, { level: 'secret_link' }, ctx.request);
      const noKey = new WorkflowPagesService({
        logger: ctx.logger,
        canEncrypt: false,
        getInternalClient: async () => ctx.internalClient,
        getScopedClient: async () => ctx.scopedClient,
        getEncryptedClient: async () => ctx.store.encryptedClient,
        isEnabled: async () => true,
        audit: ctx.audit,
        hasPrivileges: ctx.hasPrivileges,
        assertWorkflowAccess: ctx.assertWorkflowAccess,
      });

      await expect(noKey.getPage(ref, ctx.request)).resolves.toEqual(
        expect.objectContaining({ access: { level: 'secret_link' }, online: false })
      );
    });
  });

  describe('authorization', () => {
    type Operation = (service: WorkflowPagesService, request: KibanaRequest) => Promise<unknown>;

    const operations: Array<[string, WorkflowsManagementApiActions, Operation]> = [
      ['getPage', WorkflowsManagementApiActions.execute, (s, r) => s.getPage(ref, r)],
      ['getPageSecret', WorkflowsManagementApiActions.execute, (s, r) => s.getPageSecret(ref, r)],
      [
        'rotatePageSecret',
        WorkflowsManagementApiActions.managePages,
        (s, r) => s.rotatePageSecret(ref, r),
      ],
      [
        'setPageAccess',
        WorkflowsManagementApiActions.managePages,
        (s, r) => s.setPageAccess(ref, { level: 'secret_link' }, r),
      ],
      [
        'setPageOffline',
        WorkflowsManagementApiActions.managePages,
        (s, r) => s.setPageOffline(ref, true, r),
      ],
    ];

    it.each(operations)('%s checks %s in the page space', async (_, action, run) => {
      const { service, request, sync, hasPrivileges } = setup();
      await sync(pageDefinition());

      await run(service, request);

      expect(hasPrivileges).toHaveBeenCalledWith(request, ref.spaceId, [action]);
    });

    it.each(operations)('%s fails without %s and touches no page', async (_, action, run) => {
      const { service, request, sync, store, scopedClient } = setup({
        grantedActions: [
          WorkflowsManagementApiActions.execute,
          WorkflowsManagementApiActions.managePages,
        ].filter((granted) => granted !== action),
      });
      await sync(pageDefinition());

      await expect(run(service, request)).rejects.toBeInstanceOf(WorkflowPagePrivilegesError);
      expect(store.encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect(scopedClient.update).not.toHaveBeenCalled();
    });

    it.each(operations)('%s checks the workflow ACL for execute', async (_, __, run) => {
      const { service, request, sync, assertWorkflowAccess } = setup();
      await sync(pageDefinition());

      await run(service, request);

      expect(assertWorkflowAccess).toHaveBeenCalledWith(
        { workflowId: ref.workflowId, spaceId: ref.spaceId },
        'execute',
        request
      );
    });

    it.each(operations)('%s fails when the workflow ACL denies the caller', async (_, __, run) => {
      const { service, request, sync, store, scopedClient, assertWorkflowAccess } = setup();
      await sync(pageDefinition());
      assertWorkflowAccess.mockRejectedValue(new Error('acl denied'));

      await expect(run(service, request)).rejects.toThrow('acl denied');
      expect(store.encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect(scopedClient.update).not.toHaveBeenCalled();
    });

    it('lets a page manager take a page offline without workflow update', async () => {
      const { service, request, sync, hasPrivileges } = setup({
        grantedActions: [WorkflowsManagementApiActions.managePages],
      });
      await sync(pageDefinition());

      await expect(service.setPageOffline(ref, true, request)).resolves.toEqual(
        expect.objectContaining({ offline: true })
      );
      expect(hasPrivileges.mock.calls.flatMap(([, , actions]) => actions)).not.toContain(
        WorkflowsManagementApiActions.update
      );
    });

    it('audits a denied rotation', async () => {
      const { service, request, sync, audit } = setup({ grantedActions: [] });
      await sync(pageDefinition());

      await expect(service.rotatePageSecret(ref, request)).rejects.toThrow();
      expect(audit.logPageSecretRotated).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ error: expect.any(WorkflowPagePrivilegesError) })
      );
    });
  });
});
