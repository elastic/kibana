/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The context menu in fullscreen requires the 3-dot toggle to render, which only
// happens when there are overflow (non-quick) actions. After the action reorg,
// the only remaining popover-only action is "Add to case", which needs cases
// create/update capabilities — privileged login required.

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
  'Metrics in Discover - Fullscreen Mode (privileged)',
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
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
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
        await expect(metricsExperience.chartActionsFor(0).addToCase).toBeVisible();
      });

      await spaceTest.step('exit fullscreen mode', async () => {
        await metricsExperience.fullscreenButton.click();
        await expect(metricsExperience.fullscreen).toBeHidden();
      });
    });
  }
);
