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
import { createLazyPageObject, spaceTest as spaceBaseTest, tags } from '@kbn/scout';
import { Inspector } from '@kbn/inspector-plugin/test/scout/ui/fixtures/page_objects';
import { UnifiedFieldList } from '@kbn/unified-field-list/test/scout/ui/fixtures/page_objects';
import type {
  DiscoverSessionApiClassicTab,
  DiscoverSessionApiData,
  DiscoverSessionApiEsqlTab,
} from '../../../../../server/api/schema';
import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../../../../common/constants';
import * as testData from './constants';

type DiscoverSessionCreateClassicTab = Partial<DiscoverSessionApiClassicTab> &
  Pick<DiscoverSessionApiClassicTab, 'data_source' | 'id' | 'label'>;

type DiscoverSessionCreateEsqlTab = Partial<DiscoverSessionApiEsqlTab> &
  Pick<DiscoverSessionApiEsqlTab, 'data_source' | 'id' | 'label'>;

type DiscoverSessionCreateData = Omit<DiscoverSessionApiData, 'description' | 'tabs'> & {
  description?: DiscoverSessionApiData['description'];
  tabs: Array<DiscoverSessionCreateClassicTab | DiscoverSessionCreateEsqlTab>;
};

export interface DiscoverScoutSpace extends ScoutSpaceParallelFixture {
  setupDiscoverDefaults: (options?: { loadFlightsDataView?: boolean }) => Promise<void>;
  teardownDiscoverDefaults: () => Promise<void>;
  getDataViewId: (title: string) => string;
  createDiscoverSession: (data: DiscoverSessionCreateData) => Promise<void>;
}

export type DiscoverWorkerFixtures = ScoutParallelWorkerFixtures & {
  discoverScoutSpace: DiscoverScoutSpace;
};

export type DiscoverPageObjects = ScoutParallelTestFixtures['pageObjects'] & {
  inspector: Inspector;
  unifiedFieldList: UnifiedFieldList;
};

export interface DiscoverTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: DiscoverPageObjects;
}

export const spaceTest = spaceBaseTest.extend<DiscoverTestFixtures, DiscoverWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects: DiscoverPageObjects = {
      ...pageObjects,
      inspector: createLazyPageObject(Inspector, page),
      unifiedFieldList: createLazyPageObject(UnifiedFieldList, page),
    };

    await use(extendedPageObjects);
  },
  discoverScoutSpace: [
    async ({ kbnClient, scoutSpace }, use) => {
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
        createDiscoverSession: async (data) => {
          const response = await kbnClient.request({
            method: 'POST',
            path: `/s/${scoutSpace.id}${DISCOVER_SESSION_API_BASE_PATH}`,
            headers: {
              'kbn-xsrf': 'some-xsrf-token',
              'x-elastic-internal-origin': 'kibana',
              'elastic-api-version': DISCOVER_SESSION_API_VERSION,
            },
            body: data,
          });

          if (response.status !== 201) {
            throw new Error(`Failed to create Discover session: ${response.status}`);
          }
        },
      };

      await use(discoverScoutSpace);
    },
    { scope: 'worker' },
  ],
});

export { testData };
export { tags };
