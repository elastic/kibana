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
  LOGS,
  LOGS_EXPERIENCE_TAGS,
  setupLogsExperience,
  teardownLogsExperience,
} from '../fixtures';

/**
 * Both pages are reached from Discover and then reloaded, so that the profile is resolved from the
 * restored URL state rather than inherited from the session that opened them.
 */
spaceTest.describe(
  'Logs profile - Log overview tab on the context pages (getDocViewer)',
  {
    tag: LOGS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);
      // Saved data views rather than ad-hoc ones: the surrounding-document and single-document
      // pages navigate by data view id. Removed with the space in `teardownLogsExperience`.
      for (const title of [LOGS.SYNTH_CONTEXT_DATA_VIEW, LOGS.NON_LOGS_DATA_VIEW]) {
        await apiServices.dataViews.create({
          title,
          name: title,
          timeFieldName: '@timestamp',
          spaceId: scoutSpace.id,
        });
      }
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownLogsExperience(scoutSpace);
    });

    spaceTest(
      'should render the Log overview tab on the Surrounding documents page for a logs data view',
      async ({ page, pageObjects }) => {
        const { dataGrid, docViewer, logsExperience } = pageObjects;

        await logsExperience.gotoDataView(LOGS.SYNTH_CONTEXT_DATA_VIEW);
        await docViewer.openSurroundingDocuments(0);
        await expect(page).toHaveURL(/#\/context/);
        await dataGrid.waitForDocTableRendered();

        await page.reload();
        await dataGrid.waitForDocTableRendered();

        await logsExperience.openAnchorDocumentDetails();
        await docViewer.waitForFlyoutOpen();
        await expect(docViewer.getTab(LOGS.TABLE_TAB)).toBeVisible();
        await expect(docViewer.getTab(LOGS.LOGS_OVERVIEW_TAB)).toBeVisible();

        await docViewer.openTab(LOGS.LOGS_OVERVIEW_TAB);
        await expect(page.testSubj.locator(LOGS.LOGS_OVERVIEW_HEADER)).toBeVisible();
      }
    );

    spaceTest(
      'should not render the Log overview tab on the Surrounding documents page for a non-logs data view',
      async ({ page, pageObjects }) => {
        const { dataGrid, docViewer, logsExperience } = pageObjects;

        await logsExperience.gotoDataView(LOGS.NON_LOGS_DATA_VIEW);
        await docViewer.openSurroundingDocuments(0);
        await expect(page).toHaveURL(/#\/context/);
        await dataGrid.waitForDocTableRendered();

        await page.reload();
        await dataGrid.waitForDocTableRendered();

        await logsExperience.openAnchorDocumentDetails();
        await docViewer.waitForFlyoutOpen();
        await expect(docViewer.getTab(LOGS.TABLE_TAB)).toBeVisible();
        await expect(docViewer.getTab(LOGS.LOGS_OVERVIEW_TAB)).toBeHidden();
      }
    );

    spaceTest(
      'should render the Log overview tab on the Single document page for a logs data view',
      async ({ page, pageObjects }) => {
        const { docViewer, logsExperience } = pageObjects;

        await logsExperience.gotoDataView(LOGS.SYNTH_CONTEXT_DATA_VIEW);
        await docViewer.openSingleDocument(0);
        await expect(page).toHaveURL(/#\/doc/);

        await page.reload();
        await page.testSubj.locator('doc-hit').waitFor({ state: 'visible' });

        await expect(docViewer.getTab(LOGS.TABLE_TAB)).toBeVisible();
        await expect(docViewer.getTab(LOGS.LOGS_OVERVIEW_TAB)).toBeVisible();

        await docViewer.openTab(LOGS.LOGS_OVERVIEW_TAB);
        await expect(page.testSubj.locator(LOGS.LOGS_OVERVIEW_HEADER)).toBeVisible();
      }
    );

    spaceTest(
      'should not render the Log overview tab on the Single document page for a non-logs data view',
      async ({ page, pageObjects }) => {
        const { docViewer, logsExperience } = pageObjects;

        await logsExperience.gotoDataView(LOGS.NON_LOGS_DATA_VIEW);
        await docViewer.openSingleDocument(0);
        await expect(page).toHaveURL(/#\/doc/);

        await page.reload();
        await page.testSubj.locator('doc-hit').waitFor({ state: 'visible' });

        await expect(docViewer.getTab(LOGS.TABLE_TAB)).toBeVisible();
        await expect(docViewer.getTab(LOGS.LOGS_OVERVIEW_TAB)).toBeHidden();
      }
    );
  }
);
