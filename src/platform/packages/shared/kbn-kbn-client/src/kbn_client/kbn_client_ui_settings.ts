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

export interface UiSettingsPropagationDelayOptions<T = void> {
  assertion?: () => Promise<T>;
  description?: string;
  timeoutMs?: number;
  retryIntervalMs?: number;
}

export const MAX_UI_SETTINGS_PROPAGATION_DELAY_MS = 12_000; // See https://github.com/elastic/kibana/issues/265720.
const DEFAULT_UI_SETTINGS_PROPAGATION_RETRY_INTERVAL_MS = 1_000;

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

  /**
   * Wait for a uiSettings write to propagate across Kibana nodes in tests.
   *
   * Kibaan multi-node cluster can serve the next request from a different Kibana node than a test
   * writes to, so dependent assertions may need to tolerate the shared uiSettings
   * eventual-consistent cache window. See https://github.com/elastic/kibana/issues/265720.
   *
   * When `assertion` is provided, it is tried immediately and retried until it passes or the
   * propagation window expires. When `assertion` is omitted, this waits for the full propagation
   * window.
   */
  async withPropagationDelay<T>({
    assertion,
    description = 'uiSettings propagation',
    timeoutMs = MAX_UI_SETTINGS_PROPAGATION_DELAY_MS,
    retryIntervalMs = DEFAULT_UI_SETTINGS_PROPAGATION_RETRY_INTERVAL_MS,
  }: UiSettingsPropagationDelayOptions<T> = {}): Promise<T | void> {
    if (!assertion) {
      await delay(timeoutMs);
      return;
    }

    const deadline = Date.now() + timeoutMs;
    let lastError: Error | undefined;

    while (Date.now() <= deadline) {
      try {
        return await assertion();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      await delay(retryIntervalMs);
    }

    if (lastError) {
      throw new Error(`Timed out waiting for ${description}: ${lastError.message}`, {
        cause: lastError,
      });
    }

    throw new Error(`Timed out waiting for ${description} within ${timeoutMs}ms`);
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
