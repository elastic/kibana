/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import {
  WorkflowExecutionIdentityEncryptionUnavailableError,
  WorkflowExecutionIdentityMissingError,
} from './errors';
import { WorkflowExecutionIdentityService } from './execution_identity_service';
import {
  WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
  type WorkflowExecutionIdentityAttributes,
} from './saved_object';

const WORKFLOW_ID = 'wf-1';
const SPACE_ID = 'default';
const KEY_NAME = `Workflows: execution identity ${WORKFLOW_ID}`;

const encode = (id: string, secret: string) => Buffer.from(`${id}:${secret}`).toString('base64');

const sessionUser = { username: 'alice', authentication_type: 'realm' };
const sessionRequest = () => httpServerMock.createKibanaRequest();
const rawCloudRequest = (secret = 'essu_cloud_secret') =>
  httpServerMock.createKibanaRequest({
    headers: { authorization: `ApiKey ${secret}` },
  });

const notFound = () =>
  SavedObjectsErrorHelpers.createGenericNotFoundError(
    WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
    WORKFLOW_ID
  );

const decrypted = (attributes: WorkflowExecutionIdentityAttributes) => ({
  id: WORKFLOW_ID,
  type: WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
  attributes,
  references: [],
});

const createService = ({
  canEncrypt = true,
  security = securityServiceMock.createStart(),
}: {
  canEncrypt?: boolean;
  security?: ReturnType<typeof securityServiceMock.createStart>;
} = {}) => {
  security.authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(true);
  const savedObjects = savedObjectsClientMock.create();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
  encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(notFound());

  const service = new WorkflowExecutionIdentityService({
    canEncrypt,
    savedObjects,
    encryptedSavedObjects,
    security,
    logger: loggingSystemMock.createLogger(),
  });

  return { service, savedObjects, encryptedSavedObjects, security };
};

describe('WorkflowExecutionIdentityService', () => {
  describe('sync', () => {
    it('stores an ES key from a session request and getScheduleRequest uses it', async () => {
      const { service, savedObjects, encryptedSavedObjects, security } = createService();
      security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
      security.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
        id: 'es-1',
        name: KEY_NAME,
        api_key: 'es-secret',
      });

      await service.sync({
        workflowId: WORKFLOW_ID,
        spaceId: SPACE_ID,
        request: sessionRequest(),
      });

      const stored: WorkflowExecutionIdentityAttributes = {
        workflowId: WORKFLOW_ID,
        apiKey: encode('es-1', 'es-secret'),
        apiKeyOwner: 'alice',
        apiKeyCreatedByUser: false,
      };
      expect(savedObjects.create).toHaveBeenCalledWith(
        WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
        stored,
        { id: WORKFLOW_ID, overwrite: true, namespace: SPACE_ID }
      );

      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(
        decrypted(stored) as never
      );
      const scheduleRequest = await service.getScheduleRequest({
        workflowId: WORKFLOW_ID,
        spaceId: SPACE_ID,
      });
      expect(scheduleRequest.headers.authorization).toBe(`ApiKey ${encode('es-1', 'es-secret')}`);
      expect(scheduleRequest.isFakeRequest).toBe(true);
    });

    it('stores both keys and writes uiamApiKeyExternal when the request has UIAM credentials', async () => {
      const { service, savedObjects, encryptedSavedObjects, security } = createService();
      security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
      security.authc.apiKeys.uiam!.grant.mockResolvedValue({
        id: 'uiam-1',
        name: `uiam-${KEY_NAME}`,
        api_key: 'essu_granted',
      });
      security.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
        id: 'es-1',
        name: KEY_NAME,
        api_key: 'es-secret',
      });

      await service.sync({
        workflowId: WORKFLOW_ID,
        spaceId: SPACE_ID,
        request: rawCloudRequest(),
      });

      const stored: WorkflowExecutionIdentityAttributes = {
        workflowId: WORKFLOW_ID,
        apiKey: encode('es-1', 'es-secret'),
        apiKeyOwner: 'alice',
        apiKeyCreatedByUser: false,
        uiamApiKey: encode('uiam-1', 'essu_granted'),
        uiamApiKeyExternal: false,
      };
      expect(savedObjects.create).toHaveBeenCalledWith(
        WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
        stored,
        expect.objectContaining({ id: WORKFLOW_ID, overwrite: true })
      );

      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(
        decrypted(stored) as never
      );
      const scheduleRequest = await service.getScheduleRequest({
        workflowId: WORKFLOW_ID,
        spaceId: SPACE_ID,
      });
      expect(scheduleRequest.headers.authorization).toBe('ApiKey essu_granted');
    });

    it('invalidates the previous framework keys on rotate and skips a user-created key', async () => {
      const { service, encryptedSavedObjects, security } = createService();
      security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
      security.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
        id: 'es-2',
        name: KEY_NAME,
        api_key: 'new-secret',
      });

      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce(
        decrypted({
          workflowId: WORKFLOW_ID,
          apiKey: encode('es-1', 'old-secret'),
          uiamApiKey: encode('uiam-1', 'essu_old'),
          apiKeyOwner: 'alice',
          apiKeyCreatedByUser: false,
          uiamApiKeyExternal: false,
        }) as never
      );

      await service.sync({
        workflowId: WORKFLOW_ID,
        spaceId: SPACE_ID,
        request: sessionRequest(),
      });

      expect(security.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
        ids: ['es-1'],
      });
      expect(security.authc.apiKeys.uiam?.invalidate).toHaveBeenCalledWith(expect.anything(), {
        id: 'uiam-1',
      });

      security.authc.apiKeys.invalidateAsInternalUser.mockClear();
      security.authc.apiKeys.uiam!.invalidate.mockClear();
      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce(
        decrypted({
          workflowId: WORKFLOW_ID,
          apiKey: encode('user-es', 'user-secret'),
          apiKeyOwner: 'alice',
          apiKeyCreatedByUser: true,
        }) as never
      );
      security.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
        id: 'es-3',
        name: KEY_NAME,
        api_key: 'after-user',
      });

      await service.sync({
        workflowId: WORKFLOW_ID,
        spaceId: SPACE_ID,
        request: sessionRequest(),
      });

      expect(security.authc.apiKeys.invalidateAsInternalUser).not.toHaveBeenCalled();
      expect(security.authc.apiKeys.uiam?.invalidate).not.toHaveBeenCalled();
    });

    it('invalidates the granted UIAM key and does not write when the ES grant fails', async () => {
      const { service, savedObjects, security } = createService();
      security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
      security.authc.apiKeys.uiam!.grant.mockResolvedValue({
        id: 'uiam-1',
        name: `uiam-${KEY_NAME}`,
        api_key: 'essu_granted',
      });
      security.authc.apiKeys.grantAsInternalUser.mockRejectedValue(new Error('es down'));

      await expect(
        service.sync({
          workflowId: WORKFLOW_ID,
          spaceId: SPACE_ID,
          request: rawCloudRequest(),
        })
      ).rejects.toThrow('es down');

      expect(security.authc.apiKeys.uiam?.invalidate).toHaveBeenCalledWith(expect.anything(), {
        id: 'uiam-1',
      });
      expect(savedObjects.create).not.toHaveBeenCalled();
    });

    it('invalidates minted framework keys when the identity write fails', async () => {
      const { service, savedObjects, security } = createService();
      security.authc.getCurrentUser.mockReturnValue(sessionUser as never);
      security.authc.apiKeys.uiam!.grant.mockResolvedValue({
        id: 'uiam-new',
        name: `uiam-${KEY_NAME}`,
        api_key: 'essu_new',
      });
      security.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
        id: 'es-new',
        name: KEY_NAME,
        api_key: 'es-new-secret',
      });
      savedObjects.create.mockRejectedValue(new Error('so write failed'));

      await expect(
        service.sync({
          workflowId: WORKFLOW_ID,
          spaceId: SPACE_ID,
          request: rawCloudRequest(),
        })
      ).rejects.toThrow('so write failed');

      expect(security.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
        ids: ['es-new'],
      });
      expect(security.authc.apiKeys.uiam?.invalidate).toHaveBeenCalledWith(expect.anything(), {
        id: 'uiam-new',
      });
    });

    it('throws and does not write when encryption is unavailable', async () => {
      const { service, savedObjects } = createService({ canEncrypt: false });

      await expect(
        service.sync({
          workflowId: WORKFLOW_ID,
          spaceId: SPACE_ID,
          request: sessionRequest(),
        })
      ).rejects.toThrow(WorkflowExecutionIdentityEncryptionUnavailableError);
      expect(savedObjects.create).not.toHaveBeenCalled();
    });
  });

  describe('getScheduleRequest', () => {
    it('throws when no identity exists', async () => {
      const { service } = createService();

      await expect(
        service.getScheduleRequest({ workflowId: WORKFLOW_ID, spaceId: SPACE_ID })
      ).rejects.toThrow(WorkflowExecutionIdentityMissingError);
    });
  });

  describe('invalidate', () => {
    it('does not throw when the identity is missing', async () => {
      const { service, savedObjects } = createService();
      savedObjects.delete.mockRejectedValue(notFound());

      await expect(
        service.invalidate({ workflowId: WORKFLOW_ID, spaceId: SPACE_ID })
      ).resolves.toBeUndefined();
    });

    it('invalidates framework keys and deletes the saved object', async () => {
      const { service, savedObjects, encryptedSavedObjects, security } = createService();
      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(
        decrypted({
          workflowId: WORKFLOW_ID,
          apiKey: encode('es-1', 'es-secret'),
          apiKeyOwner: 'alice',
          apiKeyCreatedByUser: false,
        }) as never
      );

      await service.invalidate({ workflowId: WORKFLOW_ID, spaceId: SPACE_ID });

      expect(security.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
        ids: ['es-1'],
      });
      expect(savedObjects.delete).toHaveBeenCalledWith(
        WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
        WORKFLOW_ID,
        { namespace: SPACE_ID }
      );
    });
  });
});
