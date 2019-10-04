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

import { ToolingLog } from '../tooling_log';

import { KbnClientRequester, uriencode } from './kbn_client_requester';

export type UiSettingValues = Record<string, string | number | boolean>;
interface UiSettingsApiResponse {
  settings: {
    [key: string]: {
      userValue: string | number | boolean;
      isOverridden: boolean | undefined;
    };
  };
}

export class KbnClientUiSettings {
  constructor(
    private readonly log: ToolingLog,
    private readonly requester: KbnClientRequester,
    private readonly defaults?: UiSettingValues
  ) {}

  async get(setting: string) {
    const all = await this.getAll();
    const value = all.settings[setting] ? all.settings[setting].userValue : undefined;

    this.log.verbose('uiSettings.value: %j', value);
    return value;
  }

  /**
   * Gets defaultIndex from the config doc.
   */
  async getDefaultIndex() {
    return await this.get('defaultIndex');
  }

  /**
   * Unset a uiSetting
   */
  async unset(setting: string) {
    return await this.requester.request<any>({
      path: uriencode`/api/kibana/settings/${setting}`,
      method: 'DELETE',
    });
  }

  /**
   * Replace all uiSettings with the `doc` values, `doc` is merged
   * with some defaults
   */
  async replace(doc: UiSettingValues) {
    const all = await this.getAll();
    for (const [name, { isOverridden }] of Object.entries(all.settings)) {
      if (!isOverridden) {
        await this.unset(name);
      }
    }

    this.log.debug('replacing kibana config doc: %j', doc);

    await this.requester.request({
      method: 'POST',
      path: '/api/kibana/settings',
      body: {
        changes: {
          ...this.defaults,
          ...doc,
        },
      },
    });
  }

  /**
   * Add fields to the config doc (like setting timezone and defaultIndex)
   */
  async update(updates: UiSettingValues) {
    this.log.debug('applying update to kibana config: %j', updates);

    await this.requester.request({
      path: '/api/kibana/settings',
      method: 'POST',
      body: {
        changes: updates,
      },
    });
  }

  private async getAll() {
    return await this.requester.request<UiSettingsApiResponse>({
      path: '/api/kibana/settings',
      method: 'GET',
    });
  }
}
