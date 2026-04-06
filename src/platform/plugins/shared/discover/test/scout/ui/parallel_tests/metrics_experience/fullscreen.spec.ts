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
  DEFAULT_CONFIG,
  PAGINATION,
} from '../../fixtures/metrics_experience';

const { PAGE_SIZE } = PAGINATION;

spaceTest.describe(
  'Metrics in Discover - Fullscreen Mode',
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

    spaceTest('should toggle fullscreen mode via button', async ({ pageObjects, page }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await spaceTest.step('verify fullscreen button is visible', async () => {
        await expect(metricsExperience.fullscreenButton).toBeVisible();
      });

      await spaceTest.step('enter fullscreen mode', async () => {
        await metricsExperience.toggleFullscreen();
        await expect(metricsExperience.fullscreen).toBeVisible();
      });

      await spaceTest.step('verify grid is visible in fullscreen', async () => {
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.cards).toHaveCount(PAGE_SIZE);
      });

      await spaceTest.step('fullscreen mode has no a11y violations', async () => {
        // Exclude the grid subtree due to known aria-required-children /
        // aria-required-parent violations (missing role="row" wrapper).
        // Tracked in https://github.com/elastic/kibana/issues/258447
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="metricsGridWrapper-fullScreen"]'],
          exclude: ['[data-test-subj="unifiedMetricsExperienceGrid"]'],
        });
        expect(violations).toHaveLength(0);
      });

      await spaceTest.step('exit fullscreen mode via button', async () => {
        await metricsExperience.toggleFullscreen();
        await expect(metricsExperience.fullscreen).toBeHidden();
      });
    });

    spaceTest('should exit fullscreen mode with Escape key', async ({ pageObjects, page }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await spaceTest.step('enter fullscreen mode', async () => {
        await metricsExperience.toggleFullscreen();
        await expect(metricsExperience.fullscreen).toBeVisible();
      });

      await spaceTest.step('exit fullscreen with Escape key', async () => {
        await page.keyboard.press('Escape');
        await expect(metricsExperience.fullscreen).toBeHidden();
      });
    });

    spaceTest('should interact with metrics in fullscreen mode', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await spaceTest.step('enter fullscreen mode', async () => {
        await metricsExperience.toggleFullscreen();
        await expect(metricsExperience.fullscreen).toBeVisible();
      });

      await spaceTest.step('interact with pagination in fullscreen', async () => {
        await expect(metricsExperience.pagination.container).toBeVisible();
        await metricsExperience.pagination.nextButton.click();
        await expect(metricsExperience.cards).toHaveCount(PAGE_SIZE);
      });

      await spaceTest.step('search for metrics in fullscreen', async () => {
        await metricsExperience.searchMetric(DEFAULT_CONFIG.metrics[0].name);
        await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
      });

      await spaceTest.step('open context menu in fullscreen', async () => {
        await metricsExperience.clearSearch();
        await metricsExperience.openCardContextMenu(0);
        await expect(metricsExperience.chartActions.viewDetails).toBeVisible();
      });

      await spaceTest.step('exit fullscreen mode', async () => {
        await metricsExperience.fullscreenButton.click();
        await expect(metricsExperience.fullscreen).toBeHidden();
      });
    });

    spaceTest('should persist fullscreen state during interactions', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await spaceTest.step('enter fullscreen and open flyout', async () => {
        await metricsExperience.toggleFullscreen();
        await expect(metricsExperience.fullscreen).toBeVisible();

        await metricsExperience.openInsightsFlyout(0);
        await expect(metricsExperience.flyout.container).toBeVisible();
      });

      await spaceTest.step('close flyout and verify still in fullscreen', async () => {
        await metricsExperience.flyout.closeButton.click();
        await expect(metricsExperience.flyout.container).toBeHidden();
        await expect(metricsExperience.fullscreen).toBeVisible();
      });

      await spaceTest.step('exit fullscreen', async () => {
        await metricsExperience.toggleFullscreen();
        await expect(metricsExperience.fullscreen).toBeHidden();
      });
    });
  }
);
