/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

import type { KbnClientRequester } from './kbn_client_requester';
import { pathWithSpace } from './kbn_client_requester';

export type UiSettingValues = Record<string, string | number | boolean | string[]>;
interface UiSettingsApiResponse {
  settings: {
    [key: string]: {
      userValue: string | number | boolean;
      isOverridden: boolean | undefined;
    };
  };
}

interface WaitForUiSettingsPropagationOptions<T> {
  probe: () => Promise<T>;
  description?: string;
  space?: string;
  timeoutMs?: number;
  retryIntervalMs?: number;
}

export type UiSettingsRefreshMethod = 'direct_bypass' | 'core_app_render';

const DEFAULT_UI_SETTINGS_PROPAGATION_TIMEOUT_MS = 20_000;
const DEFAULT_UI_SETTINGS_PROPAGATION_RETRY_INTERVAL_MS = 1_000;
const DEFAULT_CORE_APP_ROUTE = '/app/home';
const DEFAULT_UI_SETTINGS_REFRESH_ROUTE = '/internal/ftr/ui_settings/_refresh';

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
      path: pathWithSpace(space)`/internal/kibana/settings/${setting}`,
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
      if (!isOverridden && !Object.hasOwn(changes, name)) {
        changes[name] = null;
      }
    }

    await this.requester.request({
      method: 'POST',
      path: pathWithSpace(space)`/internal/kibana/settings`,
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
      path: pathWithSpace(space)`/internal/kibana/settings`,
      method: 'POST',
      body: {
        changes: updates,
      },
      retries: 3,
    });
  }

  async refreshViaCoreApp({ space }: { space?: string } = {}) {
    this.log.debug('refreshing uiSettings cache via core app render');

    await this.requester.request<string>({
      description: 'refresh uiSettings cache via core app',
      path: getPathInSpace(DEFAULT_CORE_APP_ROUTE, space),
      method: 'GET',
      responseType: 'text',
      retries: 3,
    });
  }

  async refresh({ space }: { space?: string } = {}): Promise<UiSettingsRefreshMethod> {
    const response = await this.requester.request<{ refreshed: boolean }>({
      description: 'refresh uiSettings cache via direct bypass',
      path: getPathInSpace(DEFAULT_UI_SETTINGS_REFRESH_ROUTE, space),
      method: 'POST',
      ignoreErrors: [404],
    });

    if (response.status !== 404) {
      return 'direct_bypass';
    }

    this.log.debug('direct uiSettings refresh route unavailable, falling back to core app render');
    await this.refreshViaCoreApp({ space });

    return 'core_app_render';
  }

  async waitForPropagation<T>({
    probe,
    description = 'uiSettings propagation',
    space,
    timeoutMs = DEFAULT_UI_SETTINGS_PROPAGATION_TIMEOUT_MS,
    retryIntervalMs = DEFAULT_UI_SETTINGS_PROPAGATION_RETRY_INTERVAL_MS,
  }: WaitForUiSettingsPropagationOptions<T>) {
    const deadline = Date.now() + timeoutMs;
    let lastError: Error | undefined;

    while (Date.now() <= deadline) {
      try {
        return await probe();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      await this.refresh({ space });

      if (Date.now() + retryIntervalMs > deadline) {
        break;
      }

      await delay(retryIntervalMs);
    }

    if (lastError) {
      throw new Error(`Timed out waiting for ${description}: ${lastError.message}`, {
        cause: lastError,
      });
    }

    throw new Error(`Timed out waiting for ${description}`);
  }

  async updateAndWait<T>(
    updates: UiSettingValues,
    options: WaitForUiSettingsPropagationOptions<T>
  ) {
    await this.update(updates, { space: options.space });

    return await this.waitForPropagation(options);
  }

  /**
   * Update UI settings globally (like setting 'hideAnnouncements', 'theme:darkMode', etc)
   */
  async updateGlobal(updates: UiSettingValues) {
    this.log.debug('applying global update to kibana config: %j', updates);

    await this.requester.request({
      path: `/internal/kibana/global_settings`,
      method: 'POST',
      body: {
        changes: updates,
      },
      retries: 3,
    });
  }

  private async getAll({ space }: { space?: string } = {}) {
    const { data } = await this.requester.request<UiSettingsApiResponse>({
      path: pathWithSpace(space)`/internal/kibana/settings`,
      method: 'GET',
    });

    return data.settings;
  }
}

const delay = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const getPathInSpace = (path: string, space?: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!space || space === 'default') {
    return normalizedPath;
  }

  return `/s/${encodeURIComponent(space)}${normalizedPath}`;
};
