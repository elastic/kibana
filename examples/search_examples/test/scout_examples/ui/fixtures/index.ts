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
import { Inspector } from '@kbn/inspector-plugin/test/scout/ui/fixtures/page_objects';
import { SearchExamplesPage } from './page_objects';
import {
  DOWNSAMPLED_ARCHIVE,
  SAMPLE_01_DATA_VIEW_NAME,
  SAMPLE_01_DATA_VIEW_TITLE,
  SAMPLE_01_INDEX,
  SAMPLE_01_ROLLUP_INDEX,
} from './constants';

export interface SearchExamplesTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    searchExamples: SearchExamplesPage;
    inspector: Inspector;
  };
}

export interface DownsampledSample {
  readonly dataViewName: string;
  readonly dataViewTitle: string;
  readonly index: string;
  readonly rollupIndex: string;
}

export interface SearchExamplesWorkerFixtures extends ScoutWorkerFixtures {
  /**
   * Loads sample-01, downsamples into a suite-owned rollup, and creates the
   * warnings data view. Opt in from a spec; teardown restores the write block
   * and deletes only this suite's rollup and data view.
   */
  downsampledSample: DownsampledSample;
}

export const test = baseTest.extend<SearchExamplesTestFixtures, SearchExamplesWorkerFixtures>({
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
      inspector: createLazyPageObject(Inspector, page),
    });
  },
  downsampledSample: [
    async ({ apiServices, esArchiver, esClient, log }, use) => {
      try {
        log.debug('[setup:search_warnings] loading downsampled archive...');
        await esArchiver.loadIfNeeded(DOWNSAMPLED_ARCHIVE);

        const rollupExists = await esClient.indices.exists({ index: SAMPLE_01_ROLLUP_INDEX });
        if (!rollupExists) {
          await esClient.indices.addBlock({ index: SAMPLE_01_INDEX, block: 'write' });
          await esClient.indices.downsample({
            index: SAMPLE_01_INDEX,
            target_index: SAMPLE_01_ROLLUP_INDEX,
            config: { fixed_interval: '1h' },
          });
        }

        await apiServices.dataViews.create({
          title: SAMPLE_01_DATA_VIEW_TITLE,
          name: SAMPLE_01_DATA_VIEW_NAME,
          timeFieldName: '@timestamp',
          override: true,
        });

        await use({
          dataViewName: SAMPLE_01_DATA_VIEW_NAME,
          dataViewTitle: SAMPLE_01_DATA_VIEW_TITLE,
          index: SAMPLE_01_INDEX,
          rollupIndex: SAMPLE_01_ROLLUP_INDEX,
        });
      } finally {
        log.debug('[teardown:search_warnings] deleting suite-owned rollup index...');
        await esClient.indices.delete({
          index: SAMPLE_01_ROLLUP_INDEX,
          ignore_unavailable: true,
        });

        const sourceExists = await esClient.indices.exists({ index: SAMPLE_01_INDEX });
        if (sourceExists) {
          log.debug('[teardown:search_warnings] clearing write block on sample-01...');
          await esClient.indices.putSettings({
            index: SAMPLE_01_INDEX,
            settings: { 'index.blocks.write': false },
          });
        }

        await apiServices.dataViews.deleteByTitle(SAMPLE_01_DATA_VIEW_TITLE);
      }
    },
    { scope: 'worker' },
  ],
});

export { assertOtherBucketResponse } from './assert_other_bucket_response';
export {
  APP_ID,
  DATA_VIEW,
  DOWNSAMPLED_ARCHIVE,
  LENS_BASIC_KBN_ARCHIVE,
  LOGSTASH_FUNCTIONAL_ARCHIVE,
  LOGSTASH_TIME_RANGE,
  SAMPLE_01_DATA_VIEW_NAME,
  SAMPLE_01_DATA_VIEW_TITLE,
  SAMPLE_01_INDEX,
  SAMPLE_01_ROLLUP_INDEX,
} from './constants';
