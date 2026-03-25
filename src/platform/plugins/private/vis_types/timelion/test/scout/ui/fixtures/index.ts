/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { TimelionPage } from './page_objects';
import * as testData from './constants';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    timelion: TimelionPage;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtScoutTestFixtures['pageObjects'];
      page: ExtScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      timelion: createLazyPageObject(TimelionPage, page),
    };

    await use(extendedPageObjects);
  },
});

export interface TimelionSuiteSetupOptions {
  includeLongWindowLogstash?: boolean;
}

export const registerTimelionSuiteHooks = (
  scopedTest: typeof test,
  { includeLongWindowLogstash = false }: TimelionSuiteSetupOptions = {}
) => {
  scopedTest.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH_FUNCTIONAL);
    if (includeLongWindowLogstash) {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LONG_WINDOW_LOGSTASH);
    }

    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.VISUALIZE);
    await uiSettings.set({
      defaultIndex: testData.UI_SETTINGS.DEFAULT_INDEX,
      'format:bytes:defaultPattern': testData.UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN,
      'histogram:maxBars': testData.UI_SETTINGS.HISTOGRAM_MAX_BARS,
      'timepicker:timeDefaults': `{ "from": "${testData.DEFAULT_START_TIME_UTC}", "to": "${testData.DEFAULT_END_TIME_UTC}"}`,
    });
  });

  scopedTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.timelion.goto();
  });

  scopedTest.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset(
      'defaultIndex',
      'format:bytes:defaultPattern',
      'histogram:maxBars',
      'timepicker:timeDefaults'
    );
    await kbnClient.savedObjects.cleanStandardList();
  });
};

export { testData };
