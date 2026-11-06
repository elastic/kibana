/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SPACES_EXTENSION_ID } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { pageRef } from './fake_page_store.mock';
import { WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import type { WorkflowPageAuditLog } from './types';
import { WorkflowPagePrivilegesError } from './workflow_page_privileges_error';
import { WorkflowPagesService } from './workflow_pages_service';

const key = { workflowId: pageRef.workflowId, pageId: pageRef.pageId };

/** An authz fake that grants the given API actions. */
const createAuthz = (granted: WorkflowsManagementApiActions[]) => {
  const atSpace = jest.fn(async (_spaceId: string, { kibana }: { kibana: string[] }) => ({
    hasAllRequested: kibana.every((privilege) => granted.includes(privilege.slice(4) as never)),
    username: 'alice',
    privileges: {
      kibana: kibana.map((privilege) => ({
        privilege,
        authorized: granted.includes(privilege.slice(4) as never),
      })),
      elasticsearch: { cluster: [], index: {} },
    },
  }));
  const authz = {
    actions: { api: { get: (operation: string) => `api:${operation}` } },
    checkPrivilegesWithRequest: jest.fn(() => ({ atSpace })),
  } as unknown as SecurityPluginStart['authz'];
  return { authz, atSpace };
};

const setup = ({ authz }: { authz?: SecurityPluginStart['authz'] } = {}) => {
  const service = new WorkflowPagesService();
  const savedObjects = savedObjectsServiceMock.createSetupContract();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
  service.setup({ savedObjects, encryptedSavedObjects });

  const core = coreMock.createStart();
  const assertWorkflowAccess = jest.fn(async () => {});
  const getSpaceId = jest.fn((_request: KibanaRequest) => 'space-a');
  const start = service.start({
    core,
    encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    authz,
    getSpaceId,
    assertWorkflowAccess,
    audit: {
      logPageLinkRead: jest.fn(),
      logPageSecretRotated: jest.fn(),
      logPageAccessChanged: jest.fn(),
      logPageEnabledChanged: jest.fn(),
    } as jest.Mocked<WorkflowPageAuditLog>,
    logger: loggingSystemMock.createLogger(),
  });
  return { service, start, core, savedObjects, assertWorkflowAccess, getSpaceId };
};

describe('WorkflowPagesService', () => {
  it('builds the internal client without the spaces extension', () => {
    const { core } = setup();
    expect(core.savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith({
      includedHiddenTypes: [WORKFLOW_PAGE_SAVED_OBJECT_TYPE],
      excludedExtensions: [SPACES_EXTENSION_ID],
    });
  });

  it('registers the page type at setup', () => {
    const { savedObjects } = setup();
    expect(savedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ name: WORKFLOW_PAGE_SAVED_OBJECT_TYPE, hidden: true })
    );
  });

  describe('getClient', () => {
    it('resolves both page privileges in one check, in the request space', async () => {
      const { authz, atSpace } = createAuthz([WorkflowsManagementApiActions.execute]);
      const { start } = setup({ authz });

      await start.getClient({ request: httpServerMock.createKibanaRequest() });

      expect(atSpace).toHaveBeenCalledTimes(1);
      expect(atSpace).toHaveBeenCalledWith('space-a', {
        kibana: expect.arrayContaining([
          `api:${WorkflowsManagementApiActions.execute}`,
          `api:${WorkflowsManagementApiActions.managePages}`,
        ]),
      });
    });

    it('binds the client to the granted privileges', async () => {
      const { authz } = createAuthz([WorkflowsManagementApiActions.execute]);
      const { start, assertWorkflowAccess } = setup({ authz });
      const client = await start.getClient({ request: httpServerMock.createKibanaRequest() });

      await expect(client.setEnabled(key, false)).rejects.toBeInstanceOf(
        WorkflowPagePrivilegesError
      );
      await client.get(key).catch(() => undefined);
      expect(assertWorkflowAccess).toHaveBeenCalledWith(
        { workflowId: key.workflowId, spaceId: 'space-a' },
        'execute',
        expect.anything()
      );
    });

    it('grants every page operation when security is off', async () => {
      const { start, assertWorkflowAccess } = setup({ authz: undefined });
      const client = await start.getClient({ request: httpServerMock.createKibanaRequest() });

      await client.setEnabled(key, false).catch(() => undefined);

      expect(assertWorkflowAccess).toHaveBeenCalled();
    });

    it('builds the scoped client with the hidden page type', async () => {
      const { start, core } = setup();
      const request = httpServerMock.createKibanaRequest();

      await start.getClient({ request });

      expect(core.savedObjects.getScopedClient).toHaveBeenCalledWith(request, {
        includedHiddenTypes: [WORKFLOW_PAGE_SAVED_OBJECT_TYPE],
      });
    });
  });
});
