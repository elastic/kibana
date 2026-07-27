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
import type { DiscoverPageObjects } from '..';
import { spaceTest as spaceBaseTest } from '..';
import { ContextPage } from './page_objects';

export interface ContextTestFixtures {
  pageObjects: DiscoverPageObjects & {
    contextPage: ContextPage;
  };
}

export const spaceTest = spaceBaseTest.extend<ContextTestFixtures, ScoutParallelWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects: ContextTestFixtures['pageObjects'] = {
      ...pageObjects,
      contextPage: createLazyPageObject(ContextPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
export { ContextPage } from './page_objects';
export {
  addFilterWithoutStrictCheck,
  addFilters,
  addPinnedFilter,
  everyFieldMatches,
  loginAndGoToDiscover,
  navigateToFirstDocContext,
  resolveDataViewId,
} from './helpers';
