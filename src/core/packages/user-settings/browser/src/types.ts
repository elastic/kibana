/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';

export interface UserSettingsMeta {
  name: string;
  defaultValue: any;
  isSpaceAware?: boolean;
  requiredPageReload: boolean;
}

export interface IUserSettingsService {
  registerSettings: (settings: UserSettingsMeta[]) => Promise<void>;

  /**
   *
   * Gets the value of settings synchronously from the memory.
   *
   * @param key The key of the setting to get
   *
   * @returns The value of the setting, or undefined if it is not set
   * @throws Error if the setting is not registered
   *
   */
  get: <T = any>(key: string) => Promise<T>;

  /**
   *
   * Returns an observable that emits the value of the setting on every change.
   *
   * @param key The key of the setting to get
   *
   */
  get$: <T = any>(key: string, defaultOverride?: T) => Observable<T | Promise<T>>;

  /**
   * Optimistically and synchronously updates the cache and notify the observers with new value.
   * In background, sends the update request to the server and succeeds silently.
   * If the request fails, reverts the changes in the cache and notifies the observers with old value.
   *
   * @returns true if the value was set successfully, false if there was an issue
   * @throws Error if the setting is not registered
   *
   */
  set: (key: string, value: any) => boolean;

  /**
   *
   * Removes the setting from the cache and notifies the observers with undefined value.
   *
   */
  remove: (key: string) => Promise<void>;

  /**
   * Returns true if the key is a "known" or registered setting, meaning it is either registered
   * by any plugin or was previously added as a custom setting via the `set()` method.
   *
   */
  isRegistered: (key: string) => boolean;

  /**
   * Returns an Observable that notifies subscribers of each update to the uiSettings,
   * including the key, newValue, and oldValue of the setting that changed.
   */
  getUpdate$: <T = any>() => Observable<{
    key: string;
    newValue: T;
    oldValue: T;
  }>;

  /**
   * Returns an Observable that notifies subscribers of each error while trying to update
   * the settings in a key value format. The key is the setting name and the value is the error.
   *
   */
  getUpdateErrors$: () => Observable<Record<string, Error>>;
}
