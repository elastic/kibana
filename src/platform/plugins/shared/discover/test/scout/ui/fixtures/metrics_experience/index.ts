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
  BrowserAuthFixture,
  ScoutTestConfig,
} from '@kbn/scout';
import { spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import { MetricsExperiencePage } from './page_objects';
import { METRICS_EXPERIENCE_VIEWER_ROLE } from './constants';

interface MetricsExperienceBrowserAuthFixture extends BrowserAuthFixture {
  loginAsMetricsViewer: () => Promise<void>;
}

export interface MetricsExperienceTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    metricsExperience: MetricsExperiencePage;
  };
  browserAuth: MetricsExperienceBrowserAuthFixture;
}

export const spaceTest = spaceBaseTest.extend<
  MetricsExperienceTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: MetricsExperienceTestFixtures['pageObjects'];
      page: MetricsExperienceTestFixtures['page'];
    },
    use: (pageObjects: MetricsExperienceTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      metricsExperience: createLazyPageObject(MetricsExperiencePage, page),
    };

    await use(extendedPageObjects);
  },
  browserAuth: async (
    { browserAuth, config }: { browserAuth: BrowserAuthFixture; config: ScoutTestConfig },
    use: (browserAuth: MetricsExperienceBrowserAuthFixture) => Promise<void>
  ) => {
    const loginAsMetricsViewer = async () => {
      if (config.serverless && config.projectType === 'security') {
        return browserAuth.loginWithCustomRole(METRICS_EXPERIENCE_VIEWER_ROLE);
      }
      return browserAuth.loginAsViewer();
    };

    await use({ ...browserAuth, loginAsMetricsViewer });
  },
});

export * as testData from './constants';
export * from './generators';
