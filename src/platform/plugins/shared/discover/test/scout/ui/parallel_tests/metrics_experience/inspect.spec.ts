/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should open inspector and navigate through views and tabs',
      async ({ pageObjects }) => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        const { metricsExperience, inspector } = pageObjects;
        await expect(metricsExperience.grid).toBeVisible();

        await spaceTest.step('open inspector from chart context menu', async () => {
          await metricsExperience.openInspectorFlyout(0);
          await inspector.panel.waitFor({ state: 'visible' });
        });

        await spaceTest.step('verify view chooser is visible', async () => {
          await expect(inspector.viewChooser).toBeVisible();
        });

        await spaceTest.step('switch to Requests view and verify statistics', async () => {
          await inspector.switchToView('Requests');
          await expect(inspector.requests.statisticsTab).toBeVisible();
          await expect(inspector.requests.timestamp).toBeVisible();
        });

        await spaceTest.step('view request details', async () => {
          await inspector.requests.requestTab.click();
          await expect(inspector.requests.codeViewer).toBeVisible();
        });

        await spaceTest.step('view response details', async () => {
          await inspector.requests.responseTab.click();
          await expect(inspector.requests.codeViewer).toBeVisible();
        });

        await spaceTest.step('close inspector', async () => {
          await inspector.close();
        });
      }
    );
  }
);
