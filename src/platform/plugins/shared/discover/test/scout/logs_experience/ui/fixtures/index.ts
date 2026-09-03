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
import type { DiscoverPageObjects } from '../../../common/ui/fixtures';
import { spaceTest as spaceBaseTest } from '../../../common/ui/fixtures';
import { LogsExperiencePage } from './page_objects';

export interface LogsExperienceTestFixtures {
  pageObjects: DiscoverPageObjects & {
    logsExperience: LogsExperiencePage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  LogsExperienceTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects: LogsExperienceTestFixtures['pageObjects'] = {
      ...pageObjects,
      logsExperience: createLazyPageObject(
        LogsExperiencePage,
        page,
        pageObjects.dataGrid,
        pageObjects.discover
      ),
    };

    await use(extendedPageObjects);
  },
});

export { LOGS, LOGS_EXPERIENCE_TAGS, PUSH_FLYOUT_VIEWPORT } from './constants';
export {
  createNonLogsDiscoverSession,
  deleteLogsExperienceData,
  setupLogsExperience,
  teardownLogsExperience,
} from './setup';
