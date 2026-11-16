/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage, ScoutParallelTestFixtures, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { spaceTest as spaceBaseTest, createLazyPageObject, extendPlaywrightPage } from '@kbn/scout';
import type { DiscoverPageObjects } from '../../../common/ui/fixtures';
import { DiscoverPage } from '../../../common/ui/fixtures';
import { MetricsExperiencePage } from './page_objects';
import { METRICS_EXPERIENCE_VIEWER_ROLE, METRICS_EXPERIENCE_PRIVILEGED_ROLE } from './constants';

export interface SeparateBrowser {
  page: ScoutPage;
  metricsExperience: MetricsExperiencePage;
}

export interface MetricsExperienceTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: DiscoverPageObjects & {
    metricsExperience: MetricsExperiencePage;
  };
  /**
   * Opens a page in a new browser context that carries the test's current session cookies but
   * none of its local storage, standing in for the same user on another browser or device. Call it
   * after logging in. The context is closed when the test ends.
   */
  openSeparateBrowser: () => Promise<SeparateBrowser>;
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
  openSeparateBrowser: async ({ browser, context, page, kbnUrl }, use) => {
    const separateContexts: Array<Awaited<ReturnType<typeof browser.newContext>>> = [];
    await use(async () => {
      const separateContext = await browser.newContext({
        viewport: page.viewportSize(),
        storageState: { cookies: await context.cookies(), origins: [] },
      });
      separateContexts.push(separateContext);
      const separatePage = extendPlaywrightPage({ page: await separateContext.newPage(), kbnUrl });
      return { page: separatePage, metricsExperience: new MetricsExperiencePage(separatePage) };
    });
    await Promise.all(separateContexts.map((separateContext) => separateContext.close()));
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
    await use({
      ...pageObjects,
      discover: createLazyPageObject(DiscoverPage, page),
      metricsExperience: createLazyPageObject(MetricsExperiencePage, page),
    });
  },
});

export * as testData from './constants';
export * from './generators';
