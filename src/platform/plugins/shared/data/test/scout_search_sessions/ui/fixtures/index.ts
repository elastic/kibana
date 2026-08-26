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
  ScoutPage,
} from '@kbn/scout';
import { spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import { BackgroundSearchManagementPage } from './page_objects/background_search_management_page';
import { BackgroundSearchPage } from './page_objects/background_search_page';
import { PanelInspectorPage } from './page_objects/panel_inspector_page';

export interface BackgroundSearchTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    backgroundSearch: BackgroundSearchPage;
    backgroundSearchManagement: BackgroundSearchManagementPage;
    panelInspector: PanelInspectorPage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  BackgroundSearchTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: BackgroundSearchTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: BackgroundSearchTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      backgroundSearch: createLazyPageObject(BackgroundSearchPage, page),
      backgroundSearchManagement: createLazyPageObject(BackgroundSearchManagementPage, page),
      panelInspector: createLazyPageObject(PanelInspectorPage, page),
    });
  },
});

export {
  SESSION_API_PATH,
  DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE,
  DISCOVER_DEFAULT_KBN_ARCHIVE,
  FLIGHTS_SAMPLE_DATA_SET,
  LENS_BASIC_KBN_ARCHIVE,
  LOGSTASH_MONTH_TIME_RANGE,
  LOGSTASH_TIME_RANGE,
  SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE,
  STALLING_DSL_FILTER,
} from './constants';
export { BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT } from './page_objects/background_search_page';
export { deleteAllBackgroundSearches, findLoadedDashboardId } from './helpers';
