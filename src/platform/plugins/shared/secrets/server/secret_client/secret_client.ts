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
} from '../../common/types';
import type { ISecretClient } from './types';

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
  }

  async get(name: string): Promise<SecretDto | null> {
    const response = await this.soClient.find<SecretAttributes>({
      type: SECRET_SAVED_OBJECT_TYPE,
      filter: `${SECRET_SAVED_OBJECT_TYPE}.attributes.name: "${name}"`,
      perPage: 1,
    });

    if (response.saved_objects.length === 0) {
      this.logger.error(`Secret not found with name: ${name}`);
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

  async update(id: string, updates: Partial<SecretAttributes>): Promise<Partial<SecretDto>> {
    const soClient = this.soClient;
    const savedObject = await soClient.update<SecretAttributes>(SECRET_SAVED_OBJECT_TYPE, id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const { secret, ...safeAttributes } = savedObject.attributes;
    return {
      id: savedObject.id,
      ...safeAttributes,
      secret: '[ENCRYPTED]',
    };
  }

  async delete(id: string): Promise<void> {
    await this.soClient.delete(SECRET_SAVED_OBJECT_TYPE, id);
  }
}
