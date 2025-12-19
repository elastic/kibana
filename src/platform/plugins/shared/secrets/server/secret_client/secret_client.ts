/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { SECRET_SAVED_OBJECT_TYPE } from '../saved_objects/constants';
import type {
  CreateSecretCommand,
  SearchSecretsParams,
  SearchSecretsResponseDto,
  SecretAttributes,
  SecretDto,
  ISecretClient,
} from '../../common/types';

export interface SecretClientConstructorOptions {
  soClient: SavedObjectsClientContract;
  esoClient: EncryptedSavedObjectsClient;
  logger: Logger;
}

const DEFAULT_PAGE_SIZE = 100;

export class SecretClient implements ISecretClient {
  private readonly soClient: SavedObjectsClientContract;
  private readonly esoClient: EncryptedSavedObjectsClient;
  private readonly logger: Logger;

  constructor({ soClient, esoClient, logger }: SecretClientConstructorOptions) {
    this.soClient = soClient;
    this.esoClient = esoClient;
    this.logger = logger;
  }

  async create(command: CreateSecretCommand): Promise<SecretDto> {
    const createdAtDate = new Date();
    try {
      await this.requireUniqueName(command.name);
      const savedObject = await this.soClient.create<SecretAttributes>(SECRET_SAVED_OBJECT_TYPE, {
        name: command.name,
        description: command.description,
        secret: command.secret,
        updatedAt: createdAtDate.toISOString(),
        createdAt: createdAtDate.toISOString(),
      });

      // Don't return the encrypted value
      const { secret, ...safeAttributes } = savedObject.attributes;
      return {
        id: savedObject.id,
        ...safeAttributes,
        secret: '[ENCRYPTED]',
      };
    } catch (error) {
      this.logger.error(`Error creating secret: ${error.message}`, { error });
      throw error;
    }
  }

  private async requireUniqueName(name: string): Promise<void> {
    const response = await this.soClient.find<SecretAttributes>({
      type: SECRET_SAVED_OBJECT_TYPE,
      filter: `${SECRET_SAVED_OBJECT_TYPE}.attributes.name: "${name}"`,
      perPage: 1,
    });

    if (response.saved_objects.length > 0) {
      throw new Error(`Secret with name "${name}" already exists`);
    }
  }

  async get(name: string): Promise<SecretDto | null> {
    const response = await this.soClient.find<SecretAttributes>({
      type: SECRET_SAVED_OBJECT_TYPE,
      filter: `${SECRET_SAVED_OBJECT_TYPE}.attributes.name: "${name}"`,
      perPage: 1,
    });

    if (response.saved_objects.length === 0) {
      return null;
    }

    const savedObject = response.saved_objects[0];

    // Use ESO client to get decrypted value
    const {
      attributes: { secret },
    } = await this.esoClient.getDecryptedAsInternalUser<SecretAttributes>(
      SECRET_SAVED_OBJECT_TYPE,
      savedObject.id
    );

    return {
      id: savedObject.id,
      ...savedObject.attributes,
      secret,
    };
  }

  async search(params: SearchSecretsParams): Promise<SearchSecretsResponseDto> {
    const soClient = this.soClient;
    const truthyParams = Object.entries(params).filter(([_, value]) => !!value);
    const response = await soClient.find<SecretAttributes>({
      type: SECRET_SAVED_OBJECT_TYPE,
      filter:
        truthyParams.length > 0
          ? truthyParams
              .map(([key, value]) => `${SECRET_SAVED_OBJECT_TYPE}.attributes.${key}: "${value}"`)
              .join(' OR ')
          : undefined,
      perPage: DEFAULT_PAGE_SIZE,
    });
    const secrets = response.saved_objects.map((so) => {
      const { secret, ...safeAttributes } = so.attributes;
      return {
        id: so.id,
        ...safeAttributes,
        secret: '[ENCRYPTED]', // Don't expose values in list
      };
    });
    return {
      results: secrets,
      page: response.page,
      size: DEFAULT_PAGE_SIZE,
      total: response.total,
    };
  }

  async update(name: string, updates: Partial<SecretAttributes>): Promise<Partial<SecretDto>> {
    const savedObject = await this.get(name);
    if (!savedObject) {
      throw new Error(`Secret not found with name: ${name}`);
    }
    const updatedSavedObject = await this.soClient.update<SecretAttributes>(
      SECRET_SAVED_OBJECT_TYPE,
      savedObject.id,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      }
    );

    const { secret, ...safeAttributes } = updatedSavedObject.attributes;
    return {
      id: savedObject.id,
      ...safeAttributes,
      secret: '[ENCRYPTED]',
    };
  }

  async delete(name: string): Promise<void> {
    const savedObject = await this.get(name);
    if (!savedObject) {
      throw new Error(`Secret not found with name: ${name}`);
    }
    await this.soClient.delete(SECRET_SAVED_OBJECT_TYPE, savedObject.id);
  }
}
