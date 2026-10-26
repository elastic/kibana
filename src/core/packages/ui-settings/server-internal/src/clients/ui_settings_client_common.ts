/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { createOrUpgradeSavedConfig } from '../create_or_upgrade_saved_config';
import { CannotOverrideError } from '../ui_settings_errors';
import type { UiSettingsServiceOptions } from '../types';
import type { ConfigDocRef } from '../ui_settings_watcher';
import { toConfigDocRef } from '../ui_settings_watcher';
import { BaseUiSettingsClient } from './base_ui_settings_client';
import type { UserProvided } from './user_provided';
import { parseUserProvided, validateUserValue } from './user_provided';

interface ReadOptions {
  autoCreateOrUpgradeIfMissing?: boolean;
}

/**
 * Common logic for setting / removing keys in a {@link IUiSettingsClient} implementation
 */
export abstract class UiSettingsClientCommon extends BaseUiSettingsClient {
  private readonly type: UiSettingsServiceOptions['type'];
  private readonly id: UiSettingsServiceOptions['id'];
  private readonly buildNum: UiSettingsServiceOptions['buildNum'];
  private readonly savedObjectsClient: UiSettingsServiceOptions['savedObjectsClient'];
  private readonly sharedUserProvidedCache?: UiSettingsServiceOptions['sharedUserProvidedCache'];
  private readonly namespace: string;
  private readonly watcher: UiSettingsServiceOptions['watcher'];
  private readonly ref: ConfigDocRef;

  constructor(options: UiSettingsServiceOptions) {
    super(options);
    const { savedObjectsClient, type, id, buildNum, sharedUserProvidedCache, namespace, watcher } =
      options;
    this.type = type;
    this.id = id;
    this.buildNum = buildNum;
    this.savedObjectsClient = savedObjectsClient;
    this.sharedUserProvidedCache = sharedUserProvidedCache;
    this.namespace = namespace;
    this.watcher = watcher;
    this.ref = toConfigDocRef(type, namespace);
  }

  protected watchUserProvided(): Observable<UserProvided> {
    return this.watcher
      .watch(this.ref)
      .pipe(map((userProvided) => this.applyOverrides(userProvided)));
  }

  async getUserProvided<T = unknown>(bypassCache = false): Promise<UserProvided<T>> {
    if (this.sharedUserProvidedCache && !bypassCache) {
      // check for in-flight read request (deduplication)
      const inflightRead = this.sharedUserProvidedCache.getInflightRead(this.namespace);
      if (inflightRead) {
        this.log.debug(
          `[UiSettings] getUserProvided using existing in-flight read for namespace=${this.namespace}`
        );
        return this.applyOverrides(await inflightRead);
      }

      const sharedCached = this.sharedUserProvidedCache.get(this.namespace);
      if (sharedCached) {
        return this.applyOverrides(sharedCached);
      }

      this.log.debug(
        `[UiSettings] getUserProvided cache MISS - fetching from ES for namespace=${this.namespace}`
      );
    }

    // Fetch from ES, process, and cache
    const promise = this.computeUserProvided<T>();

    if (!bypassCache) {
      // Register in-flight promise for deduplication
      //
      // if the cache is being bypassed, we don't want to register the promise as other
      // calls should not wait for it but should use the existing cache entry until it is updated
      this.sharedUserProvidedCache?.setInflightRead(this.namespace, promise);
    }

    return this.applyOverrides(await promise);
  }

  private applyOverrides<T = unknown>(userProvided: UserProvided<T>): UserProvided<T> {
    return { ...userProvided, ...(this.overriddenUserProvided as UserProvided<T>) };
  }

  private async computeUserProvided<T = unknown>(): Promise<UserProvided<T>> {
    const userProvided = parseUserProvided(
      await this.read(),
      { defaults: this.defaults, overrides: this.overrides },
      this.log
    ) as UserProvided<T>;

    this.sharedUserProvidedCache?.set(this.namespace, userProvided);

    return userProvided;
  }

  async setMany(
    changes: Record<string, any>,
    { handleWriteErrors }: { validateKeys?: boolean; handleWriteErrors?: boolean } = {}
  ) {
    if (this.sharedUserProvidedCache) {
      this.log.debug(
        `[UiSettings] setMany invalidating SHARED cache for namespace=${this.namespace}`
      );
      this.sharedUserProvidedCache.del(this.namespace);
    }

    this.onWriteHook(changes);

    await this.write({ changes, handleWriteErrors });

    // Invalidate again after the write commits: a concurrent read landing in the window between the
    // pre-write invalidation and the ES commit can re-cache the pre-write value for a fresh TTL.
    this.sharedUserProvidedCache?.del(this.namespace);
    await this.watcher.notifyLocalWrite(this.ref);

    this.log.debug(`[UiSettings] setMany ES write COMPLETED for namespace=${this.namespace}`);
  }

  async set(key: string, value: any) {
    await this.setMany({ [key]: value });
  }

  async remove(key: string) {
    await this.set(key, null);
  }

  async removeMany(
    keys: string[],
    options?: { validateKeys?: boolean; handleWriteErrors?: boolean }
  ) {
    const changes: Record<string, null> = {};
    keys.forEach((key) => {
      changes[key] = null;
    });
    await this.setMany(changes, options);
  }

  private assertUpdateAllowed(key: string) {
    if (Object.hasOwn(this.overrides, key)) {
      throw new CannotOverrideError(`Unable to update "${key}" because it is overridden`);
    }
  }

  private onWriteHook(changes: Record<string, unknown>) {
    for (const key of Object.keys(changes)) {
      this.assertUpdateAllowed(key);
    }

    for (const [key, value] of Object.entries(changes)) {
      validateUserValue(this.defaults, key, value);
    }
  }

  private async write({
    changes,
    autoCreateOrUpgradeIfMissing = true,
    handleWriteErrors = false,
  }: {
    changes: Record<string, any>;
    autoCreateOrUpgradeIfMissing?: boolean;
    handleWriteErrors?: boolean;
  }) {
    try {
      await this.savedObjectsClient.update(this.type, this.id, changes, { refresh: false });
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error) || !autoCreateOrUpgradeIfMissing) {
        throw error;
      }

      await createOrUpgradeSavedConfig({
        savedObjectsClient: this.savedObjectsClient,
        version: this.id,
        buildNum: this.buildNum,
        log: this.log,
        handleWriteErrors,
        type: this.type,
      });

      await this.write({
        changes,
        autoCreateOrUpgradeIfMissing: false,
      });
    }
  }

  private async read({ autoCreateOrUpgradeIfMissing = true }: ReadOptions = {}): Promise<
    Record<string, any>
  > {
    try {
      const resp = await this.savedObjectsClient.get<Record<string, any>>(this.type, this.id);
      return resp.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error) && autoCreateOrUpgradeIfMissing) {
        const failedUpgradeAttributes = await createOrUpgradeSavedConfig({
          savedObjectsClient: this.savedObjectsClient,
          version: this.id,
          buildNum: this.buildNum,
          log: this.log,
          handleWriteErrors: true,
          type: this.type,
        });

        if (!failedUpgradeAttributes) {
          return await this.read({ autoCreateOrUpgradeIfMissing: false });
        }

        return failedUpgradeAttributes;
      }

      if (this.isIgnorableError(error)) {
        return {};
      }

      throw error;
    }
  }

  private isIgnorableError(error: Error) {
    const { isForbiddenError, isEsUnavailableError } = SavedObjectsErrorHelpers;
    return isForbiddenError(error) || isEsUnavailableError(error);
  }
}
