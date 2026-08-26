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
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest, spaceTest as baseSpaceTest, createLazyPageObject } from '@kbn/scout';
import { ConsolePage } from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    console: ConsolePage;
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
      console: createLazyPageObject(ConsolePage, page),
    };

    await use(extendedPageObjects);
  },
});

export interface ExtParallelScoutTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    console: ConsolePage;
  };
}

export const spaceTest = baseSpaceTest.extend<
  ExtParallelScoutTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtParallelScoutTestFixtures['pageObjects'];
      page: ExtParallelScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtParallelScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      console: createLazyPageObject(ConsolePage, page),
    };

    await use(extendedPageObjects);
  },
});
