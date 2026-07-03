/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Aggregation settings tests.
 *
 * These tests validate the toolbar edit button opens the aggregation
 * settings flyout, that selecting an option marks it active, and that the
 * selection persists across a page reload via Discover's persistent
 * profile state.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Aggregation Settings',
  { tag: testData.METRICS_EXPERIENCE_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'opens the flyout and marks the selected counter aggregation as active',
      async ({ pageObjects }) => {
        const { aggregationSettings } = pageObjects.metricsExperience;

        await spaceTest.step('open the flyout via the edit button', async () => {
          await aggregationSettings.open();
          await expect(aggregationSettings.flyout).toBeVisible();
        });

        await spaceTest.step('select MAX for counters', async () => {
          await aggregationSettings.selectCounterAggregation('max');
          await expect(aggregationSettings.getCounterOption('max')).toHaveAttribute(
            'aria-pressed',
            'true'
          );
        });

        await spaceTest.step('close the flyout', async () => {
          await aggregationSettings.close();
          await expect(aggregationSettings.flyout).toBeHidden();
        });
      }
    );

    spaceTest(
      'persists the selected histogram percentile across a page reload',
      async ({ pageObjects, page }) => {
        const { aggregationSettings } = pageObjects.metricsExperience;

        await spaceTest.step('select P50 for histogram percentile', async () => {
          await aggregationSettings.selectHistogramPercentile('p50');
          await expect(aggregationSettings.getHistogramOption('p50')).toHaveAttribute(
            'aria-pressed',
            'true'
          );
        });

        await spaceTest.step('close the flyout and reload the page', async () => {
          await aggregationSettings.close();
          await page.reload();
          await expect(pageObjects.metricsExperience.grid).toBeVisible();
        });

        await spaceTest.step('reopening the flyout still shows P50 selected', async () => {
          await aggregationSettings.open();
          await expect(aggregationSettings.getHistogramOption('p50')).toHaveAttribute(
            'aria-pressed',
            'true'
          );
        });
      }
    );
  }
);
