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
  createNonLogsDiscoverSession,
  LOGS,
  LOGS_EXPERIENCE_TAGS,
  setupLogsExperience,
  teardownLogsExperience,
} from '../fixtures';

spaceTest.describe(
  'Logs profile - Log overview tab presence (getDocViewer)',
  {
    tag: LOGS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownLogsExperience(scoutSpace);
    });

    spaceTest(
      'should render the Log overview tab for a logs source in ES|QL mode',
      async ({ pageObjects }) => {
        const { docViewer, logsExperience } = pageObjects;

        await logsExperience.gotoEsqlQuery(LOGS.SYNTH_CONTEXT_ESQL_QUERY);
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

        await expect(docViewer.getTab(LOGS.TABLE_TAB)).toBeVisible();
        await expect(docViewer.getTab(LOGS.LOGS_OVERVIEW_TAB)).toBeVisible();

        await docViewer.openTab(LOGS.LOGS_OVERVIEW_TAB);
        await expect(logsExperience.logsOverviewHeader).toBeVisible();
      }
    );

    spaceTest(
      'should not render the Log overview tab for a non-logs source in ES|QL mode',
      async ({ pageObjects }) => {
        const { docViewer, logsExperience } = pageObjects;

        await logsExperience.gotoEsqlQuery(LOGS.NON_LOGS_ESQL_QUERY);
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

        // The Table tab proves the flyout itself rendered, so the absence below is meaningful.
        await expect(docViewer.getTab(LOGS.TABLE_TAB)).toBeVisible();
        await expect(docViewer.getTab(LOGS.LOGS_OVERVIEW_TAB)).toBeHidden();
      }
    );

    spaceTest(
      'should render the Log overview tab for a logs data view',
      async ({ pageObjects }) => {
        const { docViewer, logsExperience } = pageObjects;

        await logsExperience.gotoDataView(LOGS.SYNTH_CONTEXT_DATA_VIEW);
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

        await expect(docViewer.getTab(LOGS.TABLE_TAB)).toBeVisible();
        await expect(docViewer.getTab(LOGS.LOGS_OVERVIEW_TAB)).toBeVisible();

        await docViewer.openTab(LOGS.LOGS_OVERVIEW_TAB);
        await expect(logsExperience.logsOverviewHeader).toBeVisible();
      }
    );

    spaceTest(
      'should not render the Log overview tab for a non-logs data view',
      async ({ apiServices, scoutSpace, pageObjects }) => {
        const { discover, docViewer } = pageObjects;

        const sessionId = await createNonLogsDiscoverSession(
          apiServices,
          scoutSpace.id,
          'non-logs-doc-viewer'
        );

        // Opened by id: the "Open search" flyout filters via a saved-object search, which lags the write.
        await discover.goto({ queryMode: 'classic', savedSearchId: sessionId });
        await discover.waitUntilTabIsLoaded();
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

        await expect(docViewer.getTab(LOGS.TABLE_TAB)).toBeVisible();
        await expect(docViewer.getTab(LOGS.LOGS_OVERVIEW_TAB)).toBeHidden();
      }
    );
  }
);
