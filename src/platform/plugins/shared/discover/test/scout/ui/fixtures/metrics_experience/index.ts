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

export interface MetricsExperienceTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    metricsExperience: MetricsExperiencePage;
  };
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
});

export * as testData from './constants';
export * from './generators';
