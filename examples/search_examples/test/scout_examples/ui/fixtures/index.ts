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
import { SearchExamplesPage } from './page_objects';

export interface SearchExamplesTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    searchExamples: SearchExamplesPage;
  };
}

export const test = baseTest.extend<SearchExamplesTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SearchExamplesTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: SearchExamplesTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      searchExamples: createLazyPageObject(SearchExamplesPage, page, pageObjects.datePicker),
    });
  },
});

export { assertOtherBucketResponse } from './assert_other_bucket_response';
export {
  APP_ID,
  DATA_VIEW,
  LENS_BASIC_KBN_ARCHIVE,
  LOGSTASH_FUNCTIONAL_ARCHIVE,
  LOGSTASH_TIME_RANGE,
} from './constants';
