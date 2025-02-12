/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiSettingValues } from '@kbn/test/src/kbn_client/kbn_client_ui_settings';
import { isValidUTCDate, formatTime } from '../../../utils';
import { coreWorkerFixtures } from '../core_fixtures';
import { UiSettingsFixture } from '.';

/**
 * This fixture provides a way to interact with Kibana UI settings.
 */
export const uiSettingsFixture = coreWorkerFixtures.extend<{}, { uiSettings: UiSettingsFixture }>({
  uiSettings: [
    async ({ kbnClient, log }, use) => {
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

      log.serviceLoaded('uiSettings');
      await use(kbnClientUiSettings);
    },
    { scope: 'worker' },
  ],
});
