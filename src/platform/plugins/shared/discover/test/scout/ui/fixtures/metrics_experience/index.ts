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
import { MetricsExperiencePage } from './page_objects';
import { METRICS_EXPERIENCE_VIEWER_ROLE, METRICS_EXPERIENCE_PRIVILEGED_ROLE } from './constants';

export interface MetricsExperienceTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    metricsExperience: MetricsExperiencePage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  MetricsExperienceTestFixtures,
  ScoutParallelWorkerFixtures
>({
  browserAuth: async ({ browserAuth, config }, use) => {
    await use({
      ...browserAuth,
      loginAsViewer: async () => {
        if (config.serverless && config.projectType === 'security') {
          return browserAuth.loginWithCustomRole(METRICS_EXPERIENCE_VIEWER_ROLE);
        }
        return browserAuth.loginAsViewer();
      },
      loginAsPrivilegedUser: async () => {
        if (config.serverless && config.projectType === 'security') {
          return browserAuth.loginWithCustomRole(METRICS_EXPERIENCE_PRIVILEGED_ROLE);
        }
        return browserAuth.loginAsPrivilegedUser();
      },
    });
  },
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
      // The core DiscoverApp.goto() was previously fixed for a flaky load issue,
      // but metrics experience tests continued to fail at a low rate due to
      // Discover not fully loading in time. Since this is not related to metrics
      // experience itself and does not add value to the experience testing, we
      // override goto here with an explicit 30s timeout instead of modifying
      // the core page object.
      // See https://github.com/elastic/kibana/issues/257436
      discover: extendPageObject(pageObjects.discover, {
        goto: async (options = {}) => {
          if (options.queryMode) {
            await pageObjects.discover.setQueryMode(options.queryMode);
          }
          await page.gotoApp('discover');
          await page.testSubj.locator('dscPage').waitFor({ state: 'visible', timeout: 30_000 });
        },
      }),
      metricsExperience: createLazyPageObject(MetricsExperiencePage, page),
    };

    await use(extendedPageObjects);
  },
});

function extendPageObject<T extends object>(base: T, overrides: Partial<T>): T {
  return Object.assign(Object.create(base), overrides) as T;
}

export * as testData from './constants';
export * from './generators';
