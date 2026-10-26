/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Extends the shared data-plugin fixture with DiscoverPage so Discover-only surface
 * (e.g. getQuerySubmitButton) is properly typed in Discover session specs.
 */

import type { ScoutParallelWorkerFixtures } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import {
  spaceTest as dataSpaceTest,
  type BackgroundSearchTestFixtures,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';
import type { DiscoverPageObjects } from '../../../scout/common/ui/fixtures';
import { DiscoverPage } from '../../../scout/common/ui/fixtures';

type DiscoverSessionPageObjects = DiscoverPageObjects & {
  backgroundSearch: BackgroundSearchTestFixtures['pageObjects']['backgroundSearch'];
  backgroundSearchManagement: BackgroundSearchTestFixtures['pageObjects']['backgroundSearchManagement'];
};

interface DiscoverSessionTestFixtures extends BackgroundSearchTestFixtures {
  pageObjects: DiscoverSessionPageObjects;
}

export const spaceTest = dataSpaceTest.extend<
  DiscoverSessionTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use({
      ...pageObjects,
      discover: createLazyPageObject(DiscoverPage, page),
    } as DiscoverSessionPageObjects);
  },
});

export {
  getSessionCookieHeader,
  findLoadedDashboardId,
  BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT,
  DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE,
  DISCOVER_DEFAULT_KBN_ARCHIVE,
  FLIGHTS_SAMPLE_DATA_SET,
  LENS_BASIC_KBN_ARCHIVE,
  LOGSTASH_FUNCTIONAL_ARCHIVE,
  LOGSTASH_MONTH_TIME_RANGE,
  LOGSTASH_TIME_RANGE,
  SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE,
  STALLING_DSL_FILTER,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';
