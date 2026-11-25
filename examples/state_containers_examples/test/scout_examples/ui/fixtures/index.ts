/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { createLazyPageObject, test as baseTest } from '@kbn/scout';
import { StateSyncPage } from './page_objects/state_sync_page';

interface StateSyncTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    stateSync: StateSyncPage;
  };
}

export const test = baseTest.extend<StateSyncTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: StateSyncTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: StateSyncTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      stateSync: createLazyPageObject(StateSyncPage, page),
    });
  },
});

export * as testData from './constants';
