/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import {
  omitUnsafePartialUpdateAttributes,
  partiallyUpdateWorkflowExecutionIdentity,
  registerWorkflowExecutionIdentitySavedObject,
  WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
  WorkflowExecutionIdentityAttributesIncludedInAAD,
  WorkflowExecutionIdentityAttributesToEncrypt,
} from './saved_object';

describe('workflow execution identity saved object', () => {
  it('encrypts only credential fields and binds owner + workflowId in AAD', () => {
    expect([...WorkflowExecutionIdentityAttributesToEncrypt]).toEqual(['apiKey', 'uiamApiKey']);
    expect([...WorkflowExecutionIdentityAttributesIncludedInAAD]).toEqual([
      'apiKeyOwner',
      'apiKeyCreatedByUser',
      'workflowId',
    ]);
  });

  it('does not put trigger-specific fields on the type, encrypt set, or AAD', () => {
    const forbidden = ['triggerType', 'requiresConnectorId', 'inboundWebhook'];
    const declared = [
      ...WorkflowExecutionIdentityAttributesToEncrypt,
      ...WorkflowExecutionIdentityAttributesIncludedInAAD,
    ];

    expect(declared.some((field) => forbidden.includes(field))).toBe(false);
  });

  it('registers a hidden space-isolated type that cannot be exported', () => {
    const savedObjects = { registerType: jest.fn() };
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    registerWorkflowExecutionIdentitySavedObject({
      savedObjects: savedObjects as never,
      encryptedSavedObjects,
    });

    expect(savedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({
        name: WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
        hidden: true,
        namespaceType: 'multiple-isolated',
        management: { importableAndExportable: false },
      })
    );
    expect(encryptedSavedObjects.registerType).toHaveBeenCalledWith({
      type: WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
      enforceRandomId: false,
      attributesToEncrypt: new Set(WorkflowExecutionIdentityAttributesToEncrypt),
      attributesToIncludeInAAD: new Set(WorkflowExecutionIdentityAttributesIncludedInAAD),
    });
  });

  it('strips encrypted and AAD attributes from a full attributes object', () => {
    expect(
      omitUnsafePartialUpdateAttributes({
        apiKey: 'must-not-write',
        uiamApiKey: 'must-not-write',
        apiKeyOwner: 'alice',
        apiKeyCreatedByUser: false,
        workflowId: 'wf-1',
        uiamApiKeyExternal: false,
      })
    ).toEqual({ uiamApiKeyExternal: false });
  });

  it('partial updates only accept non-encrypted, non-AAD fields', async () => {
    const savedObjectsClient = { update: jest.fn() };

    await partiallyUpdateWorkflowExecutionIdentity(savedObjectsClient, 'wf-1', {
      uiamApiKeyExternal: false,
    });

    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
      'wf-1',
      { uiamApiKeyExternal: false },
      {}
    );
  });
});
