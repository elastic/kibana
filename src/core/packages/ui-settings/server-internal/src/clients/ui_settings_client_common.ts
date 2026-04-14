/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { createOrUpgradeSavedConfig } from '../create_or_upgrade_saved_config';
import { CannotOverrideError } from '../ui_settings_errors';
import { Cache } from '../cache';
import type { UiSettingsServiceOptions } from '../types';
import { BaseUiSettingsClient } from './base_ui_settings_client';

interface ReadOptions {
  autoCreateOrUpgradeIfMissing?: boolean;
}

interface UserProvidedValue<T = unknown> {
  userValue?: T;
  isOverridden?: boolean;
}

type UserProvided<T = unknown> = Record<string, UserProvidedValue<T>>;

/**
 * Common logic for setting / removing keys in a {@link IUiSettingsClient} implementation
 */
export abstract class UiSettingsClientCommon extends BaseUiSettingsClient {
  private readonly type: UiSettingsServiceOptions['type'];
  private readonly id: UiSettingsServiceOptions['id'];
  private readonly buildNum: UiSettingsServiceOptions['buildNum'];
  private readonly savedObjectsClient: UiSettingsServiceOptions['savedObjectsClient'];
  private readonly cache: Cache;
  private readonly sharedUserProvidedCache?: UiSettingsServiceOptions['sharedUserProvidedCache'];
  private readonly namespace: string;

  constructor(options: UiSettingsServiceOptions) {
    super(options);
    const { savedObjectsClient, type, id, buildNum, sharedUserProvidedCache, namespace } = options;
    this.type = type;
    this.id = id;
    this.buildNum = buildNum;
    this.savedObjectsClient = savedObjectsClient;
    this.cache = new Cache();
    this.sharedUserProvidedCache = sharedUserProvidedCache;
    this.namespace = namespace;
  }

  async getUserProvided<T = unknown>(): Promise<UserProvided<T>> {
    // 1. Check shared process-wide cache
    if (this.sharedUserProvidedCache) {
      const sharedCached = this.sharedUserProvidedCache.get(this.namespace);
      if (sharedCached) {
        this.log.info(
          `[UiSettings] getUserProvided cache HIT (shared) for namespace=${this.namespace}`
        );
        return sharedCached as UserProvided<T>;
      }

      // 2. Check for in-flight request (deduplication)
      const inflight = this.sharedUserProvidedCache.getInflight(this.namespace);
      if (inflight) {
        this.log.info(
          `[UiSettings] getUserProvided using IN-FLIGHT request for namespace=${this.namespace}`
        );
        return inflight as Promise<UserProvided<T>>;
      }
    }

    // 3. Check per-instance cache (within same request)
    const instanceCached = this.cache.get();
    if (instanceCached) {
      this.log.info(
        `[UiSettings] getUserProvided cache HIT (instance) for namespace=${this.namespace}`
      );
      return instanceCached;
    }

    this.log.info(
      `[UiSettings] getUserProvided cache MISS - fetching from ES for namespace=${this.namespace}`
    );

    // 4. Fetch from ES, process, and cache at all levels
    const promise = this.computeUserProvided<T>();

    // Register in-flight promise for deduplication
    if (this.sharedUserProvidedCache) {
      this.sharedUserProvidedCache.setInflight(this.namespace, promise);
    }

    return promise;
  }

  private async computeUserProvided<T = unknown>(): Promise<UserProvided<T>> {
    this.log.info(`[UiSettings] computeUserProvided START for namespace=${this.namespace}`);
    const userProvided: UserProvided<T> = this.onReadHook(await this.read());

    // write all overridden keys, dropping the userValue is override is null and
    // adding keys for overrides that are not in saved object
    for (const [key, value] of Object.entries(this.overrides)) {
      userProvided[key] =
        value === null ? { isOverridden: true } : { isOverridden: true, userValue: value };
    }

    // Cache at instance level (per-request, 5s TTL)
    this.cache.set(userProvided);

    // Cache at shared level (cross-request)
    if (this.sharedUserProvidedCache) {
      this.sharedUserProvidedCache.set(this.namespace, userProvided, 30_000);
      this.log.info(
        `[UiSettings] computeUserProvided CACHED (30s TTL) for namespace=${
          this.namespace
        }, keys=${JSON.stringify(Object.keys(userProvided))}`
      );
    }

    return userProvided;
  }

  async setMany(
    changes: Record<string, any>,
    { handleWriteErrors }: { validateKeys?: boolean; handleWriteErrors?: boolean } = {}
  ) {
    this.log.info(
      `[UiSettings] setMany START for namespace=${this.namespace}, changes=${JSON.stringify(
        changes
      )}`
    );

    // check if a read is currently in progress, wait for it to complete before proceeding
    if (this.sharedUserProvidedCache) {
      const inflight = this.sharedUserProvidedCache.getInflight(this.namespace);
      if (inflight) {
        this.log.info(
          `[UiSettings] setMany waiting for IN-FLIGHT request for namespace=${this.namespace}`
        );
        await inflight.catch(() => {
          // Ignore errors from in-flight request, we'll invalidate regardless
        });
      }
    }

    this.log.info(
      `[UiSettings] setMany invalidating instance cache for namespace=${this.namespace}`
    );
    this.cache.del();

    // Invalidate shared getUserProvided cache for this namespace
    if (this.sharedUserProvidedCache) {
      this.log.info(
        `[UiSettings] setMany invalidating SHARED cache for namespace=${this.namespace}`
      );
      this.sharedUserProvidedCache.del(this.namespace);
    }

    this.onWriteHook(changes);
    this.log.info(`[UiSettings] setMany writing to ES for namespace=${this.namespace}`);
    await this.write({ changes, handleWriteErrors });
    this.log.info(`[UiSettings] setMany ES write COMPLETED for namespace=${this.namespace}`);

    this.log.info(`[UiSettings] setMany COMPLETED for namespace=${this.namespace}`);
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
      this.validateKey(key, value);
    }
  }

  private onReadHook<T = unknown>(values: Record<string, unknown>) {
    // write the userValue for each key stored in the saved object that is not overridden
    // validate value read from saved objects as it can be changed via SO API
    const filteredValues: UserProvided<T> = {};
    for (const [key, userValue] of Object.entries(values)) {
      if (userValue === null || Object.hasOwn(this.overrides, key)) continue;
      try {
        this.validateKey(key, userValue);
        filteredValues[key] = {
          userValue: userValue as T,
        };
      } catch (error) {
        this.log.warn(`Ignore invalid UiSettings value. ${error}.`);
      }
    }

    return filteredValues;
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
