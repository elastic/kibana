/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type KibanaRequest,
  type Logger,
  type SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  type SecurityServiceStart,
} from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { decodeApiKeyId, isUiamCredential } from '@kbn/core-security-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { buildOwnerFakeRequest } from './build_owner_fake_request';
import {
  WorkflowExecutionIdentityEncryptionUnavailableError,
  WorkflowExecutionIdentityMissingError,
} from './errors';
import {
  logMintError,
  type MintedExecutionApiKeys,
  mintExecutionApiKeys,
} from './mint_execution_api_keys';
import {
  WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
  type WorkflowExecutionIdentityAttributes,
} from './saved_object';

export interface WorkflowExecutionIdentityServiceDeps {
  canEncrypt: boolean;
  savedObjects: Pick<SavedObjectsClientContract, 'create' | 'delete'>;
  encryptedSavedObjects: Pick<EncryptedSavedObjectsClient, 'getDecryptedAsInternalUser'>;
  security: SecurityServiceStart;
  logger: Logger;
}

export interface SyncWorkflowExecutionIdentityParams {
  workflowId: string;
  spaceId: string;
  request: KibanaRequest;
}

export interface WorkflowExecutionIdentityIdParams {
  workflowId: string;
  spaceId: string;
}

const soOptions = (spaceId: string) => ({ namespace: spaceId });

const invalidateFrameworkKeys = async ({
  security,
  logger,
  workflowId,
  apiKey,
  uiamApiKey,
  apiKeyCreatedByUser,
}: {
  security: SecurityServiceStart;
  logger: Logger;
  workflowId: string;
} & Pick<
  WorkflowExecutionIdentityAttributes,
  'apiKey' | 'uiamApiKey' | 'apiKeyCreatedByUser'
>): Promise<void> => {
  if (apiKeyCreatedByUser) {
    return;
  }

  if (uiamApiKey) {
    const [uiamApiKeyId, uiamApiKeyValue] = Buffer.from(uiamApiKey, 'base64').toString().split(':');
    if (uiamApiKeyId && uiamApiKeyValue && isUiamCredential(uiamApiKeyValue)) {
      try {
        const fakeRequest = kibanaRequestFactory({
          headers: { authorization: `ApiKey ${uiamApiKeyValue}` },
        });
        await security.authc.apiKeys.uiam?.invalidate(fakeRequest, { id: uiamApiKeyId });
      } catch (error) {
        logMintError(
          logger,
          `Failed to invalidate UIAM execution identity key for workflow ${workflowId}`,
          error
        );
      }
    }
  }

  const esApiKeyId = apiKey ? decodeApiKeyId(apiKey) : undefined;
  if (!esApiKeyId) {
    return;
  }

  try {
    const result = await security.authc.apiKeys.invalidateAsInternalUser({ ids: [esApiKeyId] });
    if (result && result.error_count > 0) {
      logMintError(
        logger,
        `Failed to invalidate ES execution identity key for workflow ${workflowId}: ${result.error_details
          ?.map((error) => error.reason)
          .join(', ')}`
      );
    }
  } catch (error) {
    logMintError(
      logger,
      `Failed to invalidate ES execution identity key for workflow ${workflowId}`,
      error
    );
  }
};

export class WorkflowExecutionIdentityService {
  constructor(private readonly deps: WorkflowExecutionIdentityServiceDeps) {}

  /** Mints a new key set from `request`, overwrites the SO, then invalidates previous framework keys. */
  async sync({ workflowId, spaceId, request }: SyncWorkflowExecutionIdentityParams): Promise<void> {
    this.assertCanEncrypt();

    const previous = await this.getDecrypted(workflowId, spaceId);
    const minted = await mintExecutionApiKeys({
      request,
      security: this.deps.security,
      logger: this.deps.logger,
      workflowId,
      previousApiKeyCreatedByUser: previous?.apiKeyCreatedByUser,
    });

    try {
      await this.write(workflowId, spaceId, minted);
    } catch (error) {
      try {
        await invalidateFrameworkKeys({
          security: this.deps.security,
          logger: this.deps.logger,
          workflowId,
          ...minted,
        });
      } catch {
        // Cleanup must not replace the original write error.
      }
      throw error;
    }

    if (previous) {
      await invalidateFrameworkKeys({
        security: this.deps.security,
        logger: this.deps.logger,
        workflowId,
        apiKey: previous.apiKey,
        uiamApiKey: previous.uiamApiKey,
        apiKeyCreatedByUser: previous.apiKeyCreatedByUser,
      });
    }
  }

  /** Invalidates framework keys for the stored identity and deletes the SO. Missing SO is a no-op. */
  async invalidate({ workflowId, spaceId }: WorkflowExecutionIdentityIdParams): Promise<void> {
    this.assertCanEncrypt();

    const existing = await this.getDecrypted(workflowId, spaceId);
    if (existing) {
      await invalidateFrameworkKeys({
        security: this.deps.security,
        logger: this.deps.logger,
        workflowId,
        apiKey: existing.apiKey,
        uiamApiKey: existing.uiamApiKey,
        apiKeyCreatedByUser: existing.apiKeyCreatedByUser,
      });
    }

    try {
      await this.deps.savedObjects.delete(
        WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
        workflowId,
        soOptions(spaceId)
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw error;
      }
    }
  }

  /** Decrypts stored keys into a fakeRequest. Throws if the identity or keys are missing. */
  async getScheduleRequest({
    workflowId,
    spaceId,
  }: WorkflowExecutionIdentityIdParams): Promise<KibanaRequest> {
    this.assertCanEncrypt();

    const identity = await this.getDecrypted(workflowId, spaceId);
    if (!identity) {
      throw new WorkflowExecutionIdentityMissingError();
    }

    return buildOwnerFakeRequest({
      spaceId,
      preferUiam: this.deps.security.authc.apiKeys.uiam != null,
      apiKey: identity.apiKey,
      uiamApiKey: identity.uiamApiKey,
      uiamApiKeyExternal: identity.uiamApiKeyExternal,
    });
  }

  private assertCanEncrypt(): void {
    if (!this.deps.canEncrypt) {
      throw new WorkflowExecutionIdentityEncryptionUnavailableError();
    }
  }

  private async getDecrypted(
    workflowId: string,
    spaceId: string
  ): Promise<WorkflowExecutionIdentityAttributes | undefined> {
    try {
      const savedObject =
        await this.deps.encryptedSavedObjects.getDecryptedAsInternalUser<WorkflowExecutionIdentityAttributes>(
          WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
          workflowId,
          soOptions(spaceId)
        );
      return savedObject.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async write(
    workflowId: string,
    spaceId: string,
    minted: MintedExecutionApiKeys
  ): Promise<void> {
    await this.deps.savedObjects.create<WorkflowExecutionIdentityAttributes>(
      WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
      { workflowId, ...minted },
      { id: workflowId, overwrite: true, ...soOptions(spaceId) }
    );
  }
}
