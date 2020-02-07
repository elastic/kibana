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
import { Observable, Subject, concat, defer, of } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { UiSettingsParams, UserProvidedValues } from 'src/core/server/types';
import { IUiSettingsClient, UiSettingsState } from './types';

import { UiSettingsApi } from './ui_settings_api';

interface UiSettingsClientParams {
  api: UiSettingsApi;
  defaults: Record<string, UiSettingsParams>;
  initialSettings?: UiSettingsState;
  done$: Observable<unknown>;
}

export class UiSettingsClient implements IUiSettingsClient {
  private readonly update$ = new Subject<{ key: string; newValue: any; oldValue: any }>();
  private readonly saved$ = new Subject<{ key: string; newValue: any; oldValue: any }>();
  private readonly updateErrors$ = new Subject<Error>();

  private readonly api: UiSettingsApi;
  private readonly defaults: Record<string, UiSettingsParams>;
  private cache: Record<string, UiSettingsParams & UserProvidedValues>;

  constructor(params: UiSettingsClientParams) {
    this.api = params.api;
    this.defaults = cloneDeep(params.defaults);
    this.cache = defaultsDeep({}, this.defaults, cloneDeep(params.initialSettings));

    params.done$.subscribe({
      complete: () => {
        this.update$.complete();
        this.saved$.complete();
        this.updateErrors$.complete();
      },
    });
  }

  getAll() {
    return cloneDeep(this.cache);
  }

  get<T = any>(key: string, defaultOverride?: T) {
    const declared = this.isDeclared(key);

    if (!declared && defaultOverride !== undefined) {
      return defaultOverride;
    }

    if (!declared) {
      throw new Error(
        `Unexpected \`IUiSettingsClient.get("${key}")\` call on unrecognized configuration setting "${key}".
Setting an initial value via \`IUiSettingsClient.set("${key}", value)\` before attempting to retrieve
any custom setting value for "${key}" may fix this issue.
You can use \`IUiSettingsClient.get("${key}", defaultValue)\`, which will just return
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

  get$<T = any>(key: string, defaultOverride?: T) {
    return concat(
      defer(() => of(this.get(key, defaultOverride))),
      this.update$.pipe(
        filter(update => update.key === key),
        map(() => this.get(key, defaultOverride))
      )
    );
  }

  async set(key: string, value: any) {
    return await this.update(key, value);
  }

  async remove(key: string) {
    return await this.update(key, null);
  }

  isDeclared(key: string) {
    return key in this.cache;
  }

  isDefault(key: string) {
    return !this.isDeclared(key) || this.cache[key].userValue == null;
  }

  isCustom(key: string) {
    return this.isDeclared(key) && !('value' in this.cache[key]);
  }

  isOverridden(key: string) {
    return this.isDeclared(key) && Boolean(this.cache[key].isOverridden);
  }

  overrideLocalDefault(key: string, newDefault: any) {
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

  getUpdate$() {
    return this.update$.asObservable();
  }

  getSaved$() {
    return this.saved$.asObservable();
  }

  getUpdateErrors$() {
    return this.updateErrors$.asObservable();
  }

  private assertUpdateAllowed(key: string) {
    if (this.isOverridden(key)) {
      throw new Error(
        `Unable to update "${key}" because its value is overridden by the Kibana server`
      );
    }
  }

  private async update(key: string, newVal: any): Promise<boolean> {
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
