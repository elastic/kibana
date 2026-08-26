/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PageObjects,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutPage,
} from '@kbn/scout';
import { spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import { BackgroundSearchManagementPage } from './page_objects/background_search_management_page';

export interface BackgroundSearchTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    backgroundSearchManagement: BackgroundSearchManagementPage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  BackgroundSearchTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: BackgroundSearchTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: BackgroundSearchTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      backgroundSearchManagement: createLazyPageObject(BackgroundSearchManagementPage, page),
    });
  },
});

export { SESSION_API_PATH, DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE } from './constants';
