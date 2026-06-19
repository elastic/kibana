/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as baseTest } from '@kbn/scout';
import type {
  BrowserAuthFixture,
  PageObjects,
  ScoutPage,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import * as testData from './constants';
import type { DevToolsPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface DevToolsBrowserAuthFixture extends BrowserAuthFixture {
  loginAsDevToolsAll: () => Promise<void>;
  loginAsDevToolsRead: () => Promise<void>;
  loginAsNoDevToolsPrivileges: () => Promise<void>;
}

export interface DevToolsTestFixtures extends ScoutTestFixtures {
  browserAuth: DevToolsBrowserAuthFixture;
  pageObjects: DevToolsPageObjects;
}

export const test = baseTest.extend<DevToolsTestFixtures, ScoutWorkerFixtures>({
  browserAuth: async (
    { browserAuth }: { browserAuth: BrowserAuthFixture },
    use: (browserAuth: DevToolsBrowserAuthFixture) => Promise<void>
  ) => {
    await use({
      ...browserAuth,
      loginAsDevToolsAll: () => browserAuth.loginWithCustomRole(testData.DEV_TOOLS_ALL_ROLE),
      loginAsDevToolsRead: () => browserAuth.loginWithCustomRole(testData.DEV_TOOLS_READ_ROLE),
      loginAsNoDevToolsPrivileges: () =>
        browserAuth.loginWithCustomRole(testData.NO_DEV_TOOLS_ROLE),
    });
  },
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: PageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: DevToolsPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});

export { testData };
