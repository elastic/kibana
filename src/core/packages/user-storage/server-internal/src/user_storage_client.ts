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

interface UserStorageAttributes {
  userId: string;
  data?: Record<string, unknown>;
}

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

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
      const doc = await this.soClient.get<UserStorageAttributes>(soType, this.profileUid);
      const raw = doc.attributes.data?.[key];
      if (raw != null) {
        const parsed = definition.schema.safeParse(raw);
        if (parsed.success) {
          return parsed.data as T;
        }
        this.logger.warn(
          `Ignoring invalid userStorage value for key [${key}]. ${parsed.error.message}`
        );
      }
    } catch (err) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw err;
      }
    }

    return definition.defaultValue as T;
  }

  async getForInjection(): Promise<Record<string, unknown>> {
    const injectableEntries = [...this.definitions.entries()].filter(([, d]) => d.preload === true);
    if (injectableEntries.length === 0) return {};

    let hasSpace = false;
    let hasGlobal = false;
    for (const [, d] of injectableEntries) {
      if (d.scope === 'space') hasSpace = true;
      else if (d.scope === 'global') hasGlobal = true;
      if (hasSpace && hasGlobal) break;
    }

    const objectsToFetch: Array<{ type: string; id: string }> = [];
    if (hasSpace) objectsToFetch.push({ type: USER_STORAGE_SO_TYPE, id: this.profileUid });
    if (hasGlobal) objectsToFetch.push({ type: USER_STORAGE_GLOBAL_SO_TYPE, id: this.profileUid });

    let spaceData: Record<string, unknown> | undefined;
    let globalData: Record<string, unknown> | undefined;

    if (objectsToFetch.length > 0) {
      const { saved_objects: docs } = await this.soClient.bulkGet<UserStorageAttributes>(
        objectsToFetch
      );
      for (const doc of docs) {
        // bulkGet surfaces a missing SO via `doc.error` rather than throwing.
        if (doc.error) continue;
        if (doc.type === USER_STORAGE_SO_TYPE) {
          spaceData = doc.attributes.data;
        } else if (doc.type === USER_STORAGE_GLOBAL_SO_TYPE) {
          globalData = doc.attributes.data;
        }
      }
    }

    const result: Record<string, unknown> = {};
    for (const [key, definition] of injectableEntries) {
      const data = definition.scope === 'space' ? spaceData : globalData;
      const raw = data?.[key];
      if (raw != null) {
        const parsed = definition.schema.safeParse(raw);
        if (parsed.success) {
          result[key] = parsed.data;
          continue;
        }
        this.logger.warn(
          `Ignoring invalid userStorage value for key [${key}]. ${parsed.error.message}`
        );
      }
      result[key] = definition.defaultValue;
    }
    return result;
  }

  async set<T = unknown>(key: string, value: T): Promise<T> {
    const definition = this.assertRegistered(key);
    const validated = definition.schema.parse(value) as T;
    const soType = this.getSoType(definition);

    this.logger.debug(`Setting userStorage key [${key}] (scope: ${definition.scope})`);

    const dataUpdate = { data: { [key]: validated } };

    try {
      await this.soClient.update(soType, this.profileUid, dataUpdate);
    } catch (err) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        this.logger.error(
          `Failed to update userStorage key [${key}] for user [${this.profileUid}] ` +
            `(type: ${soType}, scope: ${definition.scope}): ${getErrorMessage(err)}`
        );
        throw err;
      }

      this.logger.debug(
        `No existing userStorage document [${soType}/${this.profileUid}]; creating one for key [${key}].`
      );

      try {
        await this.soClient.create(
          soType,
          { userId: this.profileUid, data: { [key]: validated } },
          { id: this.profileUid }
        );
      } catch (createErr) {
        // A conflict here can mean one of two things:
        //  1. A concurrent first-write for this user (same space) beat us to create().
        //  2. The user already owns a `${soType}` document in a DIFFERENT space.
        //     `${soType}` documents use a globally-unique id (the profile uid), so
        //     the same id cannot be (re)created in this space.
        // We can only recover from (1) by retrying the update; (2) is unrecoverable
        // from this space and is surfaced with an explicit, actionable error.
        if (!SavedObjectsErrorHelpers.isConflictError(createErr)) {
          this.logger.error(
            `Failed to create userStorage document [${soType}/${this.profileUid}] for key [${key}] ` +
              `(scope: ${definition.scope}): ${getErrorMessage(createErr)}`
          );
          throw createErr;
        }

        this.logger.debug(
          `Conflict creating userStorage document [${soType}/${this.profileUid}] for key [${key}]; ` +
            `retrying as update.`
        );

        try {
          await this.soClient.update(soType, this.profileUid, dataUpdate);
        } catch (retryErr) {
          if (SavedObjectsErrorHelpers.isNotFoundError(retryErr)) {
            // The create reported a conflict but the document is not visible in this
            // space, so the retry update cannot find it. This happens when the user
            // already has a `${soType}` document owned by another space (its id is
            // globally unique and namespace-isolated), which cannot be written here.
            this.logger.error(
              `Unable to persist userStorage key [${key}] for user [${this.profileUid}] ` +
                `(type: ${soType}, scope: ${definition.scope}): create reported a conflict but the ` +
                `document is not present in this space, so it likely belongs to a different space. ` +
                `"${soType}" uses a globally-unique, namespace-isolated document id, so it cannot be ` +
                `written from more than one space. Underlying error: ${getErrorMessage(retryErr)}`
            );
          } else {
            this.logger.error(
              `Failed to persist userStorage key [${key}] for user [${this.profileUid}] ` +
                `(type: ${soType}, scope: ${definition.scope}) after create-conflict retry: ` +
                `${getErrorMessage(retryErr)}`
            );
          }
          throw retryErr;
        }
      }
    }

    return validated;
  }

  async remove(key: string): Promise<void> {
    const definition = this.assertRegistered(key);
    const soType = this.getSoType(definition);

    this.logger.debug(`Removing userStorage key [${key}] (scope: ${definition.scope})`);

    try {
      await this.soClient.update(soType, this.profileUid, { data: { [key]: null } });
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
}
