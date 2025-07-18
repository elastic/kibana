/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserProfileService } from '@kbn/core-user-profile-browser';
import { Observable, Subject, concat, defer, filter, map, of } from 'rxjs';
import { isEqual } from 'lodash';
import { UserProfileData } from '@kbn/core-user-profile-common';
import { IUserSettingsService, UserSettingsMeta } from './types';
import { debounceAsync } from './utils';

const UPDATE_DEBOUNCE_TIMEOUT = 1000;
const SETTING_DELIMITER = ':';

export class UserSettingsService implements IUserSettingsService {
  protected cache: Map<string, any>;
  protected meta: Map<string, UserSettingsMeta>;
  private update$ = new Subject<{ key: string; newValue: any; oldValue: any }>();
  private updateErrors$ = new Subject<Record<string, Error>>();
  protected userSettingUpdater;

  constructor(
    private userProfile: UserProfileService,
    private spaceId: string,
    private appId: string
  ) {
    this.cache = new Map();
    this.meta = new Map<string, UserSettingsMeta>();
    this.userSettingUpdater = debounceAsync<<D extends UserProfileData>(data: D) => Promise<void>>(
      this.userProfile.partialUpdate,
      UPDATE_DEBOUNCE_TIMEOUT
    );
  }

  private getFullSettingName(key: string) {
    const isSpaceAware = this.meta.get(key)?.isSpaceAware;

    return isSpaceAware
      ? [key, this.spaceId].join(SETTING_DELIMITER)
      : [key].join(SETTING_DELIMITER);
  }

  public isRegistered(key: string) {
    return this.meta.has(key);
  }

  private assertRegistered(key: string) {
    if (!this.isRegistered(key)) {
      throw new Error(`Setting ${key} is not registered.`);
    }
  }

  private serializeCache() {
    return JSON.stringify(Array.from(this.cache.entries()));
  }

  private deserializeCache(serializedCache: string) {
    return new Map<string, any>(JSON.parse(serializedCache));
  }

  async remove(key: string): Promise<void> {
    this.assertRegistered(key);
    this.cache.delete(this.getFullSettingName(key));
    await this.userProfile.partialUpdate({
      userSettings: {
        [this.appId]: this.serializeCache(),
      },
    });
  }

  /**
   *
   * Registers settings with required meta data.
   * Populate the cache with the stored values or default values in case there are no stored values.
   *
   * */
  async registerSettings(settings: UserSettingsMeta[]) {
    const defaultsCache: Map<string, any> = new Map();

    settings.forEach((setting) => {
      if (this.meta.has(setting.name)) {
        throw new Error(`Setting ${setting.name} is already registered`);
      }
      this.meta.set(setting.name, setting);
      defaultsCache.set(this.getFullSettingName(setting.name), setting.defaultValue);
    });

    const savedSettingsWrapped = await this.userProfile.getCurrent<{
      userSettings: {
        [appId: string]: string;
      };
    }>({
      dataPath: `userSettings.${this.appId}`,
    });

    const savedSettings = this.deserializeCache(
      savedSettingsWrapped.data?.userSettings?.[this.appId] ?? '[]'
    );

    this.cache = new Map([...defaultsCache, ...this.cache, ...savedSettings]);
  }

  get<T>(key: string): T {
    this.assertRegistered(key);
    return (this.cache.get(this.getFullSettingName(key)) ?? this.meta.get(key)?.defaultValue) as T;
  }

  get$<T>(key: string): Observable<T> {
    this.assertRegistered(key);
    return concat(
      defer(() => of(this.get<T>(key))),
      this.update$.pipe(
        filter(({ key: updatedKey }) => updatedKey === key),
        map(() => this.get<T>(key))
      )
    );
  }

  set(key: string, newValue: any): boolean {
    this.assertRegistered(key);
    return this.update(key, newValue);
  }

  private update(key: string, newValue: any): boolean {
    this.assertRegistered(key);
    const fullSettingName = this.getFullSettingName(key);
    const valueBeforeUpdate = this.cache.get(fullSettingName);
    if (isEqual(valueBeforeUpdate, newValue)) {
      return true;
    }

    this.updateCache(key, newValue);

    const updatedCacheSerialized = this.serializeCache();
    this.userSettingUpdater?.({
      userSettings: {
        [this.appId]: updatedCacheSerialized,
      },
    }).catch((error) => {
      // revert Changes
      this.cache.set(fullSettingName, valueBeforeUpdate);
      this.update$.next({ key, newValue: valueBeforeUpdate, oldValue: newValue });
      this.updateErrors$.next({
        [key]: error,
      });
    });

    return true;
  }

  private updateCache(key: string, newValue: any) {
    const fullSettingName = this.getFullSettingName(key);
    const oldValue = this.cache.get(fullSettingName);
    this.cache.set(fullSettingName, newValue);
    this.update$.next({ key, newValue, oldValue });
  }

  getUpdate$<T>(): Observable<{ key: string; newValue: T; oldValue: T }> {
    return this.update$.asObservable();
  }

  getUpdateErrors$(): Observable<Record<string, Error>> {
    return this.updateErrors$.asObservable();
  }
}
