/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelWorkerFixtures } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import type { DiscoverPageObjects } from '../../../common/ui/fixtures';
import { spaceTest as spaceBaseTest } from '../../../common/ui/fixtures';
import { SecurityDiscoverFlyout } from './page_objects';

export interface SecurityExperienceTestFixtures {
  pageObjects: DiscoverPageObjects & {
    securityDiscoverFlyout: SecurityDiscoverFlyout;
  };
}

export const spaceTest = spaceBaseTest.extend<
  SecurityExperienceTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects: SecurityExperienceTestFixtures['pageObjects'] = {
      ...pageObjects,
      securityDiscoverFlyout: createLazyPageObject(
        SecurityDiscoverFlyout,
        page,
        pageObjects.dataGrid,
        pageObjects.docViewer,
        pageObjects.discover,
        pageObjects.dashboard
      ),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
export * from './constants';
export * from './generators';
export { setupSecurityExperience, teardownSecurityExperience } from './setup';
