/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsClientMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { WorkflowPageAttributes } from './page_saved_object';
import {
  getWorkflowPageSavedObjectId,
  partiallyUpdateWorkflowPage,
  registerWorkflowPageType,
  WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
} from './page_saved_object';

describe('workflow-page saved object', () => {
  it('registers a hidden, encrypted type with AAD on workflowId and pageId only', () => {
    const savedObjects = savedObjectsServiceMock.createSetupContract();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup();

    registerWorkflowPageType({ savedObjects, encryptedSavedObjects });

    expect(savedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({
        name: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        hidden: true,
        namespaceType: 'multiple-isolated',
        management: { importableAndExportable: false },
      })
    );
    expect(encryptedSavedObjects.registerType).toHaveBeenCalledWith({
      type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      attributesToEncrypt: new Set(['secret']),
      attributesToIncludeInAAD: new Set(['workflowId', 'pageId']),
    });
  });

  it('builds a stable id from the workflow and the page', () => {
    const id = getWorkflowPageSavedObjectId({ workflowId: 'w', pageId: 'default' });
    expect(getWorkflowPageSavedObjectId({ workflowId: 'w', pageId: 'default' })).toBe(id);
    expect(getWorkflowPageSavedObjectId({ workflowId: 'w', pageId: 'other' })).not.toBe(id);
    expect(getWorkflowPageSavedObjectId({ workflowId: 'w2', pageId: 'default' })).not.toBe(id);
  });

  describe('partiallyUpdateWorkflowPage', () => {
    it('never sends encrypted or AAD attributes', async () => {
      const client = savedObjectsClientMock.create();
      const unsafe = {
        enabled: false,
        access: { level: 'secret_link' as const },
        secret: 'leak',
        secretHash: 'leak',
        workflowId: 'other',
        pageId: 'other',
      } as unknown as Partial<WorkflowPageAttributes>;

      await partiallyUpdateWorkflowPage(client, 'id', unsafe, { version: 'v1' });

      expect(client.update).toHaveBeenCalledWith(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        'id',
        { enabled: false, access: { level: 'secret_link' } },
        { version: 'v1' }
      );
    });

    it('sends a null access level, which takes the page offline', async () => {
      const client = savedObjectsClientMock.create();
      await partiallyUpdateWorkflowPage(client, 'id', { access: null });
      expect(client.update).toHaveBeenCalledWith(
        WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
        'id',
        { access: null },
        {}
      );
    });
  });
});
