/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

import { KbnClientRequester, pathWithSpace } from './kbn_client_requester';

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

  async get(setting: string, { space }: { space?: string } = {}) {
    const all = await this.getAll({ space });
    const value = all[setting]?.userValue;

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
  async unset(setting: string, { space }: { space?: string } = {}) {
    const { data } = await this.requester.request<any>({
      path: pathWithSpace(space)`/api/kibana/settings/${setting}`,
      method: 'DELETE',
    });
    return data;
  }

  /**
   * Replace all uiSettings with the `doc` values, `doc` is merged
   * with some defaults
   */
  async replace(
    doc: UiSettingValues,
    { retries = 5, space }: { retries?: number; space?: string } = {}
  ) {
    this.log.debug('replacing kibana config doc: %j', doc);

    const changes: Record<string, any> = {
      ...this.defaults,
      ...doc,
    };

    for (const [name, { isOverridden }] of Object.entries(await this.getAll())) {
      if (!isOverridden && !changes.hasOwnProperty(name)) {
        changes[name] = null;
      }
    }

    await this.requester.request({
      method: 'POST',
      path: pathWithSpace(space)`/api/kibana/settings`,
      body: { changes },
      retries,
    });
  }

  /**
   * Add fields to the config doc (like setting timezone and defaultIndex)
   */
  async update(updates: UiSettingValues, { space }: { space?: string } = {}) {
    this.log.debug('applying update to kibana config: %j', updates);

    await this.requester.request({
      path: pathWithSpace(space)`/api/kibana/settings`,
      method: 'POST',
      body: {
        changes: updates,
      },
      retries: 3,
    });
  }

  private async getAll({ space }: { space?: string } = {}) {
    const { data } = await this.requester.request<UiSettingsApiResponse>({
      path: pathWithSpace(space)`/api/kibana/settings`,
      method: 'GET',
    });

    return data.settings;
  }
}
