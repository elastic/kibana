/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { FlyoutSystemApp } from './page_objects';

export interface FlyoutSystemTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    flyoutSystem: FlyoutSystemApp;
  };
}

export const test = baseTest.extend<FlyoutSystemTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: FlyoutSystemTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: FlyoutSystemTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      flyoutSystem: createLazyPageObject(FlyoutSystemApp, page),
    });
  },
});

export type { ChildLabel, FlyoutForm } from './page_objects';
