/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { UserStorageDefinition, IUserStorageClient } from '@kbn/core-user-storage-common';
import { USER_STORAGE_SO_TYPE, USER_STORAGE_GLOBAL_SO_TYPE } from './saved_objects';

interface UserStorageClientOpts {
  savedObjectsClient: SavedObjectsClientContract;
  profileUid: string;
  definitions: ReadonlyMap<string, UserStorageDefinition>;
  logger: Logger;
}

/** @internal */
export class UserStorageClient implements IUserStorageClient {
  private readonly soClient: SavedObjectsClientContract;
  private readonly profileUid: string;
  private readonly definitions: ReadonlyMap<string, UserStorageDefinition>;
  private readonly logger: Logger;

  constructor({ savedObjectsClient, profileUid, definitions, logger }: UserStorageClientOpts) {
    this.soClient = savedObjectsClient;
    this.profileUid = profileUid;
    this.definitions = definitions;
    this.logger = logger;
  }

  async get<T = unknown>(key: string): Promise<T> {
    const definition = this.assertRegistered(key);
    const soType = this.getSoType(definition);

    try {
      const doc = await this.soClient.get<Record<string, unknown>>(soType, this.profileUid);
      const raw = doc.attributes[key];
      if (raw != null) {
        return raw as T;
      }
    } catch (err) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw err;
      }
    }

    return definition.defaultValue as T;
  }

  async getAll(): Promise<Record<string, unknown>> {
    let hasSpace = false;
    let hasGlobal = false;
    for (const d of this.definitions.values()) {
      if (d.scope === 'space') hasSpace = true;
      else if (d.scope === 'global') hasGlobal = true;
      if (hasSpace && hasGlobal) break;
    }

    const [spaceAttrs, globalAttrs] = await Promise.all([
      hasSpace ? this.readSoAttributes(USER_STORAGE_SO_TYPE) : undefined,
      hasGlobal ? this.readSoAttributes(USER_STORAGE_GLOBAL_SO_TYPE) : undefined,
    ]);

    const result: Record<string, unknown> = {};
    for (const [key, definition] of this.definitions) {
      const attrs = definition.scope === 'space' ? spaceAttrs : globalAttrs;
      const raw = attrs?.[key];
      result[key] = raw != null ? raw : definition.defaultValue;
    }
    return result;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const definition = this.assertRegistered(key);
    const validated = definition.schema.parse(value);
    const soType = this.getSoType(definition);

    this.logger.debug(`Setting userStorage key [${key}] (scope: ${definition.scope})`);

    try {
      await this.soClient.update(soType, this.profileUid, { [key]: validated });
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        try {
          await this.soClient.create(soType, { [key]: validated }, { id: this.profileUid });
        } catch (createErr) {
          if (SavedObjectsErrorHelpers.isConflictError(createErr)) {
            await this.soClient.update(soType, this.profileUid, { [key]: validated });
          } else {
            throw createErr;
          }
        }
      } else {
        throw err;
      }
    }
  }

  async remove(key: string): Promise<void> {
    const definition = this.assertRegistered(key);
    const soType = this.getSoType(definition);

    this.logger.debug(`Removing userStorage key [${key}] (scope: ${definition.scope})`);

    try {
      await this.soClient.update(soType, this.profileUid, { [key]: null });
    } catch (err) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw err;
      }
    }
  }

  private assertRegistered(key: string): UserStorageDefinition {
    const definition = this.definitions.get(key);
    if (!definition) {
      throw new Error(`userStorage key [${key}] is not registered`);
    }
    return definition;
  }

  private getSoType(definition: UserStorageDefinition): string {
    return definition.scope === 'space' ? USER_STORAGE_SO_TYPE : USER_STORAGE_GLOBAL_SO_TYPE;
  }

  private async readSoAttributes(soType: string): Promise<Record<string, unknown> | undefined> {
    try {
      const doc = await this.soClient.get<Record<string, unknown>>(soType, this.profileUid);
      return doc.attributes;
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    }
  }
}
