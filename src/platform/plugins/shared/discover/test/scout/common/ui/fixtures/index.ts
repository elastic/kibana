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
  ScoutPage,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutSpaceParallelFixture,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import {
  createLazyPageObject,
  spaceTest as spaceBaseTest,
  test as baseTest,
  tags,
} from '@kbn/scout';
import { Inspector } from '@kbn/inspector-plugin/test/scout/ui/fixtures/page_objects';
import { UnifiedFieldList } from '@kbn/unified-field-list/test/scout/ui/fixtures/page_objects';
import { DocViewer } from '@kbn/unified-doc-viewer/test/scout/ui/fixtures/page_objects';
import { LookupIndexEditor } from './page_objects';
import * as testData from './constants';

export interface DiscoverScoutSpace extends ScoutSpaceParallelFixture {
  setupDiscoverDefaults: (options?: {
    loadFlightsDataView?: boolean;
    loadLongWindowDataView?: boolean;
  }) => Promise<void>;
  teardownDiscoverDefaults: () => Promise<void>;
  getDataViewId: (title: string) => string;
}

export type DiscoverWorkerFixtures = ScoutParallelWorkerFixtures & {
  discoverScoutSpace: DiscoverScoutSpace;
};

export type DiscoverPageObjects = PageObjects & {
  inspector: Inspector;
  unifiedFieldList: UnifiedFieldList;
  lookupIndexEditor: LookupIndexEditor;
  docViewer: DocViewer;
};

export interface DiscoverTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: DiscoverPageObjects;
}

const extendWithDiscoverPageObjects = (
  pageObjects: PageObjects,
  page: ScoutPage
): DiscoverPageObjects => ({
  ...pageObjects,
  inspector: createLazyPageObject(Inspector, page),
  unifiedFieldList: createLazyPageObject(UnifiedFieldList, page),
  lookupIndexEditor: createLazyPageObject(LookupIndexEditor, page, pageObjects.dataGrid),
  docViewer: createLazyPageObject(DocViewer, page),
});

export const spaceTest = spaceBaseTest.extend<DiscoverTestFixtures, DiscoverWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendWithDiscoverPageObjects(pageObjects, page));
  },
  discoverScoutSpace: [
    async ({ scoutSpace }, use) => {
      const dataViewIds = new Map<string, string>();
      const loadSavedObjects = async (path: string) => {
        const imported = await scoutSpace.savedObjects.load(path);
        imported
          .filter(({ type }) => type === 'index-pattern')
          .forEach(({ id, title }) => dataViewIds.set(title, id));
      };

      const discoverScoutSpace: DiscoverScoutSpace = {
        ...scoutSpace,
        setupDiscoverDefaults: async ({
          loadFlightsDataView = false,
          loadLongWindowDataView = false,
        } = {}) => {
          await loadSavedObjects(testData.DISCOVER_KBN_ARCHIVE);
          if (loadFlightsDataView) {
            await loadSavedObjects(testData.FLIGHTS_KBN_ARCHIVE);
          }
          if (loadLongWindowDataView) {
            await loadSavedObjects(testData.LONG_WINDOW_LOGSTASH_KBN_ARCHIVE);
          }
          await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
          await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
        },
        teardownDiscoverDefaults: async () => {
          await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
          await scoutSpace.savedObjects.cleanStandardList();
          dataViewIds.clear();
        },
        getDataViewId: (title) => {
          return dataViewIds.get(title) ?? title;
        },
      };

      await use(discoverScoutSpace);
    },
    { scope: 'worker' },
  ],
});

/**
 * Default-space (single-worker) variant used by the sequential Discover UI suite.
 * Exposes the same page objects as `spaceTest` but runs in the default space.
 */
export const test = baseTest.extend<{ pageObjects: DiscoverPageObjects }, ScoutWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendWithDiscoverPageObjects(pageObjects, page));
  },
});

export { testData };
export { tags };
export * from './constants';
export * from './helpers';
