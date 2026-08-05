/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * "Recently explored" sort: interacting with a metric card records it, and the
 * recency sort surfaces interacted metrics first (most recent first). Gated
 * behind `discover.metricsExperienceSortEnabled`, enabled for the whole
 * parallel suite in `parallel_tests/global.setup.ts`.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../fixtures';

spaceTest.describe(
  'Metrics in Discover - Recently explored',
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
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('moves an interacted metric to the front', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;

      await expect(metricsExperience.grid).toBeVisible();

      const targetTitle = metricsExperience.getCardTitle(1);
      await expect(targetTitle).not.toHaveText('');
      const targetMetricName = await targetTitle.textContent();

      // Interacting with a card records it (only panel actions count, not the chart body).
      await metricsExperience.openInsightsFlyout(1);
      await metricsExperience.flyout.closeButton.click();
      await metricsExperience.flyout.container.waitFor({ state: 'hidden' });

      await metricsExperience.selectSortBy('recency');

      // The interacted metric moves to the front.
      await expect(metricsExperience.getCardTitle(0)).toHaveText(String(targetMetricName));
    });

    spaceTest('disables the direction toggle when sorting by recency', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;

      await expect(metricsExperience.grid).toBeVisible();

      // Alphabetical sort (the default) lets the user pick a direction.
      await expect(metricsExperience.sortDirectionAsc).toBeEnabled();
      await expect(metricsExperience.sortDirectionDesc).toBeEnabled();

      // Recency is always most-recent-first, so the direction toggle is disabled.
      await metricsExperience.selectSortBy('recency');
      await expect(metricsExperience.sortDirectionAsc).toBeDisabled();
      await expect(metricsExperience.sortDirectionDesc).toBeDisabled();
    });
  }
);
