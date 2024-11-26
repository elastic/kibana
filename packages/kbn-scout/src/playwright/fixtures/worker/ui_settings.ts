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
import { ScoutWorkerFixtures } from '../types';
import { isValidUTCDate } from '../../utils';

export const uiSettingsFixture = base.extend<{}, ScoutWorkerFixtures>({
  uiSettings: [
    ({ kbnClient }, use) => {
      const kbnClientUiSettings = {
        set: async (values: UiSettingValues) => kbnClient.uiSettings.update(values),

        unset: async (...keys: string[]) =>
          Promise.all(keys.map((key) => kbnClient.uiSettings.unset(key))),

        setDefaultTime: async ({ from, to }: { from: string; to: string }) => {
          if (!isValidUTCDate(from) || !isValidUTCDate(to)) {
            throw new Error(
              `Invalid UTC date format. Ensure 'from' and 'to' are in ISO 8601 format (e.g., '2024-11-25T10:00:00.000Z').`
            );
          }
          await kbnClient.uiSettings.update({
            'timepicker:timeDefaults': `{ "from": "${from}", "to": "${to}"}`,
          });
        },
      };

      use(kbnClientUiSettings);
    },
    { scope: 'worker' },
  ],
});
