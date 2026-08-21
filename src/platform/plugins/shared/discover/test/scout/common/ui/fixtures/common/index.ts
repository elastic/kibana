/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutSpaceParallelFixture,
} from '@kbn/scout';
import { spaceTest as spaceBaseTest, tags } from '@kbn/scout';
import * as testData from './constants';

export interface DiscoverScoutSpace extends ScoutSpaceParallelFixture {
  setupDiscoverDefaults: (options?: { loadFlightsDataView?: boolean }) => Promise<void>;
  teardownDiscoverDefaults: () => Promise<void>;
  getDataViewId: (title: string) => string;
}

export type DiscoverWorkerFixtures = ScoutParallelWorkerFixtures & {
  discoverScoutSpace: DiscoverScoutSpace;
};

export const spaceTest = spaceBaseTest.extend<ScoutParallelTestFixtures, DiscoverWorkerFixtures>({
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
        setupDiscoverDefaults: async ({ loadFlightsDataView = false } = {}) => {
          await loadSavedObjects(testData.DISCOVER_KBN_ARCHIVE);
          if (loadFlightsDataView) {
            await loadSavedObjects(testData.FLIGHTS_KBN_ARCHIVE);
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

export { testData };
export { tags };
