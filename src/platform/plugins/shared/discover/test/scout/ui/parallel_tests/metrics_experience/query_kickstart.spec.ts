/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  DEFAULT_TIME_RANGE,
  PAGINATION,
} from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Query kickstart',
  {
    tag: testData.METRICS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should run Search all metrics from recommended queries', async ({ pageObjects }) => {
      const { discover, metricsExperience } = pageObjects;
      let selectedRecommendation = '';
      await discover.selectTextBaseLang();

      await spaceTest.step('open recommended queries from the ES|QL help menu', async () => {
        await discover.openRecommendedQueriesPanel();
      });

      await spaceTest.step('apply Search all metrics query recommendation', async () => {
        selectedRecommendation = await discover.runRecommendedEsqlQuery(
          testData.RECOMMENDED_QUERY_LABELS.SEARCH_ALL_METRICS,
          testData.RECOMMENDED_QUERY_LABELS.SEARCH_ALL_FIELDS_FALLBACK
        );
      });

      await spaceTest.step('render metrics grid using the recommended query', async () => {
        await expect
          .poll(async () => {
            if (selectedRecommendation === testData.RECOMMENDED_QUERY_LABELS.SEARCH_ALL_METRICS) {
              const gridVisible = await metricsExperience.grid.isVisible();
              const paginationVisible = await metricsExperience.pagination.container.isVisible();
              const cardCount = await metricsExperience.cards.count();
              return gridVisible && paginationVisible && cardCount === PAGINATION.PAGE_SIZE;
            }

            const gridVisible = await metricsExperience.grid.isVisible();
            return !gridVisible;
          })
          .toBe(true);
      });
    });
  }
);
