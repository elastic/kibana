/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';
import { UiSettingValues } from '@kbn/test/src/kbn_client/kbn_client_ui_settings';
import { isValidUTCDate, formatTime } from '../../../utils';
import { KbnClient, ToolingLog } from '../../common';

export interface UiSettingsFixture {
  /**
   * Applies one or more UI settings
   * @param values (UiSettingValues): An object containing key-value pairs of UI settings to apply.
   * @returns A Promise that resolves once the settings are applied.
   */
  set: (values: UiSettingValues) => Promise<void>;
  /**
   * Resets specific UI settings to their default values.
   * @param values A list of UI setting keys to unset.
   * @returns A Promise that resolves after the settings are unset.
   */
  unset: (...values: string[]) => Promise<any>;
  /**
   * Sets the default time range for Kibana.
   * @from The start time of the default time range.
   * @to The end time of the default time range.
   * @returns A Promise that resolves once the default time is set.
   */
  setDefaultTime: ({ from, to }: { from: string; to: string }) => Promise<void>;
}

/**
 * This fixture provides a way to interact with Kibana UI settings.
 */
export const uiSettingsFixture = base.extend<
  {},
  { kbnClient: KbnClient; uiSettings: UiSettingsFixture; log: ToolingLog }
>({
  uiSettings: [
    ({ kbnClient, log }, use) => {
      const kbnClientUiSettings = {
        set: async (values: UiSettingValues) => {
          await kbnClient.uiSettings.update(values);
        },

        unset: async (...keys: string[]) =>
          Promise.all(keys.map((key) => kbnClient.uiSettings.unset(key))),

        setDefaultTime: async ({ from, to }: { from: string; to: string }) => {
          const utcFrom = isValidUTCDate(from) ? from : formatTime(from);
          const untcTo = isValidUTCDate(to) ? to : formatTime(to);
          await kbnClient.uiSettings.update({
            'timepicker:timeDefaults': `{ "from": "${utcFrom}", "to": "${untcTo}"}`,
          });
        },
      };

      use(kbnClientUiSettings);
    },
    { scope: 'worker' },
  ],
});
