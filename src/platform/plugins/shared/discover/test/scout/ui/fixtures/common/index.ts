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
  ScoutSpaceParallelFixture,
} from '@kbn/scout';
import { createLazyPageObject, spaceTest as spaceBaseTest, tags } from '@kbn/scout';
import { DocViewer } from '@kbn/unified-doc-viewer-plugin/test/scout/ui/fixtures/page_objects';
import * as testData from './constants';

export interface DiscoverScoutTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    docViewer: DocViewer;
  };
}

export interface DiscoverScoutSpace extends ScoutSpaceParallelFixture {
  setupDiscoverDefaults: () => Promise<void>;
  teardownDiscoverDefaults: () => Promise<void>;
}

export type DiscoverWorkerFixtures = ScoutParallelWorkerFixtures & {
  discoverScoutSpace: DiscoverScoutSpace;
};

export const spaceTest = spaceBaseTest.extend<DiscoverScoutTestFixtures, DiscoverWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: DiscoverScoutTestFixtures['pageObjects'];
      page: DiscoverScoutTestFixtures['page'];
    },
    use: (pageObjects: DiscoverScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      docViewer: createLazyPageObject(DocViewer, page),
    });
  },
  discoverScoutSpace: [
    async ({ scoutSpace }, use) => {
      const discoverScoutSpace: DiscoverScoutSpace = {
        ...scoutSpace,
        setupDiscoverDefaults: async () => {
          await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
          await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
          await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
        },
        teardownDiscoverDefaults: async () => {
          await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
          await scoutSpace.savedObjects.cleanStandardList();
        },
      };

      await use(discoverScoutSpace);
    },
    { scope: 'worker' },
  ],
});

export { testData };
export { tags };
