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
} from '@kbn/scout';
import { spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import { SecurityDiscoverFlyout } from './page_objects';

export interface SecurityExperienceTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    securityDiscoverFlyout: SecurityDiscoverFlyout;
  };
}

export const spaceTest = spaceBaseTest.extend<
  SecurityExperienceTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SecurityExperienceTestFixtures['pageObjects'];
      page: SecurityExperienceTestFixtures['page'];
    },
    use: (pageObjects: SecurityExperienceTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      securityDiscoverFlyout: createLazyPageObject(
        SecurityDiscoverFlyout,
        page,
        pageObjects.discover,
        pageObjects.dashboard
      ),
    });
  },
});

export * as testData from './constants';
export * from './constants';
export * from './generators';
export { setupSecurityExperience, teardownSecurityExperience } from './setup';
