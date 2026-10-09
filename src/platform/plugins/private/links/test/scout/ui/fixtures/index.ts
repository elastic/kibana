/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import type {
  PageObjects,
  ScoutPage,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
} from '@kbn/scout';
import { LinksPanel } from './page_objects';

export interface LinksPageObjects extends PageObjects {
  linksPanel: LinksPanel;
}

export interface LinksTestFixtures extends ScoutTestFixtures {
  pageObjects: LinksPageObjects;
}

export const spaceTest = spaceBaseTest.extend<LinksTestFixtures, ScoutParallelWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: LinksPageObjects; page: ScoutPage },
    use: (pageObjects: LinksPageObjects) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      linksPanel: createLazyPageObject(LinksPanel, page),
    });
  },
});
