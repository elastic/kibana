/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { WORKFLOW_SECRET_SAVED_OBJECT_TYPE } from './saved_objects/constants';

interface WorkflowSecretAttributes {
  name: string;
  description: string;
  secret: string;
  updatedAt: string;
  createdAt: string;
}

interface WorkflowSecretDto extends WorkflowSecretAttributes {
  id: string;
}

interface CreateWorkflowSecretCommand {
  name: string;
  description: string;
  secret: string;
}

export class WorkflowSecretsService {
  constructor(
    private soClient: SavedObjectsClientContract,
    private esoClient: EncryptedSavedObjectsClient
  ) {}

  async createSecret(command: CreateWorkflowSecretCommand): Promise<WorkflowSecretDto> {
    const savedObject = await this.soClient.create<WorkflowSecretAttributes>(
      WORKFLOW_SECRET_SAVED_OBJECT_TYPE,
      {
        name: command.name,
        description: command.description,
        secret: command.secret,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
    );

    // Don't return the encrypted value
    const { secret, ...safeAttributes } = savedObject.attributes;
    return {
      id: savedObject.id,
      ...safeAttributes,
      secret: '[ENCRYPTED]',
    };
  }

  async getSecretWithValue(id: string): Promise<WorkflowSecretDto> {
    // Use ESO client to get decrypted value
    const savedObject = await this.esoClient.getDecryptedAsInternalUser<WorkflowSecretAttributes>(
      WORKFLOW_SECRET_SAVED_OBJECT_TYPE,
      id
    );

    return {
      id: savedObject.id,
      ...savedObject.attributes,
    };
  }

  async findSecrets({ name, description }: { name?: string; description?: string } = {}): Promise<
    WorkflowSecretDto[]
  > {
    const response = await this.soClient.find<WorkflowSecretAttributes>({
      type: WORKFLOW_SECRET_SAVED_OBJECT_TYPE,
      filter: `workflow-secrets.attributes.name: "${name}" OR workflow-secrets.attributes.description: "${description}"`,
      perPage: 100,
    });

    return response.saved_objects.map((so) => ({
      id: so.id,
      ...so.attributes,
      secret: '[ENCRYPTED]', // Don't expose values in list
    }));
  }

  async updateSecret(
    id: string,
    updates: Partial<WorkflowSecretAttributes>
  ): Promise<Partial<WorkflowSecretDto>> {
    const savedObject = await this.soClient.update<WorkflowSecretAttributes>(
      WORKFLOW_SECRET_SAVED_OBJECT_TYPE,
      id,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      }
    );

    const { secret, ...safeAttributes } = savedObject.attributes;
    return {
      id: savedObject.id,
      ...safeAttributes,
      secret: '[ENCRYPTED]',
    };
  }

  async deleteSecret(id: string): Promise<void> {
    await this.soClient.delete(WORKFLOW_SECRET_SAVED_OBJECT_TYPE, id);
  }
}
