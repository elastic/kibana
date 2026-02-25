/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { TRACES } from '../../fixtures/traces_experience';

spaceTest.describe(
  'Traces in Discover - Overview tab',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      if (!config.serverless) {
        await scoutSpace.setSolutionView('oblt');
      }
      await scoutSpace.savedObjects.load(TRACES.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(TRACES.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime({
        from: TRACES.DEFAULT_START_TIME,
        to: TRACES.DEFAULT_END_TIME,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should show Overview tab in the document flyout', async ({ page, pageObjects }) => {
      await spaceTest.step('wait for results and open first document', async () => {
        await pageObjects.discover.waitForDocTableRendered();
        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.discover.waitForDocViewerFlyoutOpen();
      });

      await spaceTest.step('verify Overview tab is present', async () => {
        await expect(
          page.testSubj.locator('docViewerTab-doc_view_obs_traces_overview')
        ).toBeVisible();
      });
    });

    spaceTest('should render the Similar Spans section', async ({ page, pageObjects }) => {
      await spaceTest.step('open first document in flyout', async () => {
        await pageObjects.discover.waitForDocTableRendered();
        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.discover.waitForDocViewerFlyoutOpen();
      });

      await spaceTest.step('select Overview tab', async () => {
        await page.testSubj.locator('docViewerTab-doc_view_obs_traces_overview').click();
      });

      await spaceTest.step('verify Similar Spans section is visible', async () => {
        await expect(page.testSubj.locator('docViewerSimilarSpansSection')).toBeVisible({
          timeout: 30_000,
        });
      });
    });

    spaceTest('should render the Trace Summary section', async ({ page, pageObjects }) => {
      await spaceTest.step('open first document in flyout', async () => {
        await pageObjects.discover.waitForDocTableRendered();
        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.discover.waitForDocViewerFlyoutOpen();
      });

      await spaceTest.step('select Overview tab', async () => {
        await page.testSubj.locator('docViewerTab-doc_view_obs_traces_overview').click();
      });

      await spaceTest.step('verify Trace Summary section is visible', async () => {
        await expect(page.testSubj.locator('unifiedDocViewerTraceSummarySection')).toBeVisible({
          timeout: 30_000,
        });
      });
    });

    spaceTest('should render the Logs section', async ({ page, pageObjects }) => {
      await spaceTest.step('open first document in flyout', async () => {
        await pageObjects.discover.waitForDocTableRendered();
        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.discover.waitForDocViewerFlyoutOpen();
      });

      await spaceTest.step('select Overview tab', async () => {
        await page.testSubj.locator('docViewerTab-doc_view_obs_traces_overview').click();
      });

      await spaceTest.step('verify Logs section is visible', async () => {
        await expect(page.testSubj.locator('unifiedDocViewerLogsSection')).toBeVisible({
          timeout: 30_000,
        });
      });
    });
  }
);
