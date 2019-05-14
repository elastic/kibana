/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { cloneDeep, defaultsDeep } from 'lodash';
import * as Rx from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { UiSettingsState } from './types';
import { UiSettingsApi } from './ui_settings_api';

/** @public */
interface UiSettingsClientParams {
  api: UiSettingsApi;
  defaults: UiSettingsState;
  initialSettings?: UiSettingsState;
}

/** @public */
export class UiSettingsClient {
  private readonly update$ = new Rx.Subject<{ key: string; newValue: any; oldValue: any }>();
  private readonly saved$ = new Rx.Subject<{ key: string; newValue: any; oldValue: any }>();
  private readonly updateErrors$ = new Rx.Subject<Error>();

  private readonly api: UiSettingsApi;
  private readonly defaults: UiSettingsState;
  private cache: UiSettingsState;

  constructor(params: UiSettingsClientParams) {
    this.api = params.api;
    this.defaults = cloneDeep(params.defaults);
    this.cache = defaultsDeep({}, this.defaults, cloneDeep(params.initialSettings));
  }

  /**
   * Gets the metadata about all uiSettings, including the type, default value, and user value
   * for each key.
   */
  public getAll() {
    return cloneDeep(this.cache);
  }

  /**
   * Gets the value for a specific uiSetting. If this setting has no user-defined value
   * then the `defaultOverride` parameter is returned (and parsed if setting is of type
   * "json" or "number). If the parameter is not defined and the key is not defined by a
   * uiSettingDefaults then an error is thrown, otherwise the default is read
   * from the uiSettingDefaults.
   */
  public get(key: string, defaultOverride?: any) {
    const declared = this.isDeclared(key);

    if (!declared && defaultOverride !== undefined) {
      return defaultOverride;
    }

    if (!declared) {
      throw new Error(
        `Unexpected \`config.get("${key}")\` call on unrecognized configuration setting "${key}".
Setting an initial value via \`config.set("${key}", value)\` before attempting to retrieve
any custom setting value for "${key}" may fix this issue.
You can use \`config.get("${key}", defaultValue)\`, which will just return
\`defaultValue\` when the key is unrecognized.`
      );
    }

    const type = this.cache[key].type;
    const userValue = this.cache[key].userValue;
    const defaultValue = defaultOverride !== undefined ? defaultOverride : this.cache[key].value;
    const value = userValue == null ? defaultValue : userValue;

    if (type === 'json') {
      return JSON.parse(value);
    }

    if (type === 'number') {
      return parseFloat(value);
    }

    return value;
  }

  /**
   * Gets an observable of the current value for a config key, and all updates to that config
   * key in the future. Providing a `defaultOverride` argument behaves the same as it does in #get()
   */
  public get$(key: string, defaultOverride?: any) {
    return Rx.concat(
      Rx.defer(() => Rx.of(this.get(key, defaultOverride))),
      this.update$.pipe(
        filter(update => update.key === key),
        map(() => this.get(key, defaultOverride))
      )
    );
  }

  /**
   * Sets the value for a uiSetting. If the setting is not defined in the uiSettingDefaults
   * it will be stored as a custom setting. The new value will be synchronously available via
   * the `get()` method and sent to the server in the background. If the request to the
   * server fails then a toast notification will be displayed and the setting will be
   * reverted it its value before `set()` was called.
   */
  public async set(key: string, val: any) {
    return await this.update(key, val);
  }

  /**
   * Removes the user-defined value for a setting, causing it to revert to the default. This
   * method behaves the same as calling `set(key, null)`, including the synchronization, custom
   * setting, and error behavior of that method.
   */
  public async remove(key: string) {
    return await this.update(key, null);
  }

  /**
   * Returns true if the key is a "known" uiSetting, meaning it is either defined in the
   * uiSettingDefaults or was previously added as a custom setting via the `set()` method.
   */
  public isDeclared(key: string) {
    return key in this.cache;
  }

  /**
   * Returns true if the setting has no user-defined value or is unknown
   */
  public isDefault(key: string) {
    return !this.isDeclared(key) || this.cache[key].userValue == null;
  }

  /**
   * Returns true if the setting is not a part of the uiSettingDefaults, but was either
   * added directly via `set()`, or is an unknown setting found in the uiSettings saved
   * object
   */
  public isCustom(key: string) {
    return this.isDeclared(key) && !('value' in this.cache[key]);
  }

  /**
   * Returns true if a settings value is overridden by the server. When a setting is overridden
   * its value can not be changed via `set()` or `remove()`.
   */
  public isOverridden(key: string) {
    return this.isDeclared(key) && Boolean(this.cache[key].isOverridden);
  }

  /**
   * Overrides the default value for a setting in this specific browser tab. If the page
   * is reloaded the default override is lost.
   */
  public overrideLocalDefault(key: string, newDefault: any) {
    // capture the previous value
    const prevDefault = this.defaults[key] ? this.defaults[key].value : undefined;

    // update defaults map
    this.defaults[key] = {
      ...(this.defaults[key] || {}),
      value: newDefault,
    };

    // update cached default value
    this.cache[key] = {
      ...(this.cache[key] || {}),
      value: newDefault,
    };

    // don't broadcast change if userValue was already overriding the default
    if (this.cache[key].userValue == null) {
      this.update$.next({ key, newValue: newDefault, oldValue: prevDefault });
      this.saved$.next({ key, newValue: newDefault, oldValue: prevDefault });
    }
  }

  /**
   * Returns an Observable that notifies subscribers of each update to the uiSettings,
   * including the key, newValue, and oldValue of the setting that changed.
   */
  public getUpdate$() {
    return this.update$.asObservable();
  }

  /**
   * Returns an Observable that notifies subscribers of each update to the uiSettings,
   * including the key, newValue, and oldValue of the setting that changed.
   */
  public getSaved$() {
    return this.saved$.asObservable();
  }

  /**
   * Returns an Observable that notifies subscribers of each error while trying to update
   * the settings, containing the actual Error class.
   */
  public getUpdateErrors$() {
    return this.updateErrors$.asObservable();
  }

  /**
   * Prepares the uiSettingsClient to be discarded, completing any update$ observables
   * that have been created.
   */
  public stop() {
    this.update$.complete();
    this.saved$.complete();
  }

  private assertUpdateAllowed(key: string) {
    if (this.isOverridden(key)) {
      throw new Error(
        `Unable to update "${key}" because its value is overridden by the Kibana server`
      );
    }
  }

  private async update(key: string, newVal: any) {
    this.assertUpdateAllowed(key);

    const declared = this.isDeclared(key);
    const defaults = this.defaults;

    const oldVal = declared ? this.cache[key].userValue : undefined;

    const unchanged = oldVal === newVal;
    if (unchanged) {
      return true;
    }

    const initialVal = declared ? this.get(key) : undefined;
    this.setLocally(key, newVal);

    try {
      const { settings } = await this.api.batchSet(key, newVal);
      this.cache = defaultsDeep({}, defaults, settings);
      this.saved$.next({ key, newValue: newVal, oldValue: initialVal });
      return true;
    } catch (error) {
      this.setLocally(key, initialVal);
      this.updateErrors$.next(error);
      return false;
    }
  }

  private setLocally(key: string, newValue: any) {
    this.assertUpdateAllowed(key);

    if (!this.isDeclared(key)) {
      this.cache[key] = {};
    }

    const oldValue = this.get(key);

    if (newValue === null) {
      delete this.cache[key].userValue;
    } else {
      const { type } = this.cache[key];
      if (type === 'json' && typeof newValue !== 'string') {
        this.cache[key].userValue = JSON.stringify(newValue);
      } else {
        this.cache[key].userValue = newValue;
      }
    }

    this.update$.next({ key, newValue, oldValue });
  }
}
