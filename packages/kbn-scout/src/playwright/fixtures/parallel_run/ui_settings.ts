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
import { KbnClient, ToolingLog, UiSettingsFixture, WorkerSpaceFixure } from '../types';
import { isValidUTCDate, formatTime } from '../../utils';

/**
 * This fixture provides a way to interact with Kibana UI settings.
 */
export const uiSettingsSpaceFixture = base.extend<
  {},
  {
    kbnClient: KbnClient;
    uiSettings: UiSettingsFixture;
    workerSpace: WorkerSpaceFixure;
    log: ToolingLog;
  }
>({
  uiSettings: [
    ({ kbnClient, workerSpace, log }, use) => {
      const kbnClientUiSettings = {
        set: async (values: UiSettingValues) => {
          log.info(`Setting UI settings for space ${workerSpace.id}: ${JSON.stringify(values)}`);
          return kbnClient.uiSettings.update(values, { space: workerSpace.id });
        },

        unset: async (...keys: string[]) => {
          log.info(`Unsetting UI settings for space ${workerSpace.id}: ${keys}`);
          return Promise.all(
            keys.map((key) => kbnClient.uiSettings.unset(key, { space: workerSpace.id }))
          );
        },
        setDefaultTime: async ({ from, to }: { from: string; to: string }) => {
          const utcFrom = isValidUTCDate(from) ? from : formatTime(from);
          const untcTo = isValidUTCDate(to) ? to : formatTime(to);
          await kbnClient.uiSettings.update(
            {
              'timepicker:timeDefaults': `{ "from": "${utcFrom}", "to": "${untcTo}"}`,
            },
            { space: workerSpace.id }
          );
        },
      };

      use(kbnClientUiSettings);
    },
    { scope: 'worker' },
  ],
});
