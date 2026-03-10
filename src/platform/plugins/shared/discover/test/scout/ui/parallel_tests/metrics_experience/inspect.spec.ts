/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Inspect action tests: view query details and request/response data.
 *
 * These tests verify that the Inspect panel can be opened from a metric chart
 * and displays query details, request/response data, and statistics.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Inspect',
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

    spaceTest('should open inspector flyout and view query details', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      const cardIndex = 0;

      await spaceTest.step('open inspector flyout from chart context menu', async () => {
        await metricsExperience.openInspectorFlyout(cardIndex);
        await expect(metricsExperience.inspectorFlyout.panel).toBeVisible();
      });

      await spaceTest.step('verify view chooser is visible with available views', async () => {
        await expect(metricsExperience.inspectorFlyout.viewChooser).toBeVisible();
      });

      await spaceTest.step('switch to Requests view', async () => {
        await metricsExperience.inspectorFlyout.viewChooser.click();
        await metricsExperience.inspectorFlyout.requestsView.click();
        await expect(metricsExperience.inspectorFlyout.statisticsTab).toBeVisible();
      });

      await spaceTest.step('verify statistics are displayed', async () => {
        await expect(metricsExperience.inspectorFlyout.requestTimestamp).toBeVisible();
      });

      await spaceTest.step('view request details', async () => {
        await metricsExperience.inspectorFlyout.requestTab.click();
        await expect(metricsExperience.inspectorFlyout.requestCodeViewer).toBeVisible();
      });

      await spaceTest.step('close inspector flyout', async () => {
        await metricsExperience.closeInspectorFlyout();
        await expect(metricsExperience.inspectorFlyout.panel).toBeHidden();
      });
    });

    spaceTest('should show request metadata in inspector flyout', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await spaceTest.step('open inspector flyout for first card', async () => {
        await metricsExperience.openInspectorFlyout(0);
        await expect(metricsExperience.inspectorFlyout.panel).toBeVisible();
      });

      await spaceTest.step('navigate to Requests view', async () => {
        await metricsExperience.inspectorFlyout.viewChooser.click();
        await metricsExperience.inspectorFlyout.requestsView.click();
        await expect(metricsExperience.inspectorFlyout.statisticsTab).toBeVisible();
      });

      await spaceTest.step('verify request timestamp is present', async () => {
        await expect(metricsExperience.inspectorFlyout.requestTimestamp).toBeVisible();
      });

      await spaceTest.step('view response details', async () => {
        await metricsExperience.inspectorFlyout.responseTab.click();
        await expect(metricsExperience.inspectorFlyout.requestCodeViewer).toBeVisible();
      });

      await spaceTest.step('close inspector flyout', async () => {
        await metricsExperience.closeInspectorFlyout();
      });
    });
  }
);
