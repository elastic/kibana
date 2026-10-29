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

const [FIRST_ROW, , LAST_ROW] = LOGS.SYNTH_CONTEXT_ROWS;

spaceTest.describe(
  'Logs profile - Cell renderers in data view mode (getCellRenderers)',
  {
    tag: LOGS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);
      // Saved data views rather than ad-hoc ones, so the surrounding-documents cases below have a
      // data view id to navigate with. Removed with the rest of the space's saved objects in
      // `teardownLogsExperience`.
      for (const title of [LOGS.SYNTH_CONTEXT_DATA_VIEW, LOGS.NON_LOGS_FIELDS_DATA_VIEW]) {
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
      'should render the log.level badge cell, including on the Surrounding documents page',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover, docViewer, logsExperience, unifiedFieldList } = pageObjects;

        await logsExperience.gotoDataView(LOGS.SYNTH_CONTEXT_DATA_VIEW);
        await unifiedFieldList.clickFieldListItemAdd(LOGS.LOG_LEVEL_FIELD);
        await discover.waitUntilTabIsLoaded();

        await expect(logsExperience.logLevelBadge(0, FIRST_ROW.logLevel)).toHaveText(
          FIRST_ROW.logLevel
        );

        await docViewer.openSurroundingDocuments(0);
        await expect(page).toHaveURL(/#\/context/);
        await dataGrid.waitForDocTableRendered();

        // Reloaded so the profile is resolved from the restored URL state rather than inherited
        // from the Discover session that opened the page.
        await page.reload();
        await dataGrid.waitForDocTableRendered();

        await expect(logsExperience.logLevelBadge(0, FIRST_ROW.logLevel)).toHaveText(
          FIRST_ROW.logLevel
        );
      }
    );

    spaceTest(
      'should not render the log.level badge cell when the source is not logs',
      async ({ page, pageObjects }) => {
        const { dataGrid, discover, docViewer, logsExperience, unifiedFieldList } = pageObjects;

        await logsExperience.gotoDataView(LOGS.NON_LOGS_FIELDS_DATA_VIEW);
        await unifiedFieldList.clickFieldListItemAdd(LOGS.LOG_LEVEL_FIELD);
        await discover.waitUntilTabIsLoaded();

        await expect(dataGrid.getCellValue(0, LOGS.LOG_LEVEL_FIELD)).toHaveText(
          LOGS.NON_LOGS_LOG_LEVEL
        );
        await expect(logsExperience.logLevelBadges).toHaveCount(0);

        await docViewer.openSurroundingDocuments(0);
        await expect(page).toHaveURL(/#\/context/);
        await dataGrid.waitForDocTableRendered();

        await page.reload();
        await dataGrid.waitForDocTableRendered();

        await expect(dataGrid.getCellValue(1, LOGS.LOG_LEVEL_FIELD)).toHaveText(
          LOGS.NON_LOGS_LOG_LEVEL
        );
        await expect(logsExperience.logLevelBadges).toHaveCount(0);
      }
    );

    spaceTest('should render the service.name cell', async ({ pageObjects }) => {
      const { discover, logsExperience, unifiedFieldList } = pageObjects;

      await logsExperience.gotoDataView(LOGS.SYNTH_CONTEXT_DATA_VIEW);
      await unifiedFieldList.clickFieldListItemAdd(LOGS.SERVICE_NAME_FIELD);
      await discover.waitUntilTabIsLoaded();

      await expect(logsExperience.serviceNameCell(0)).toHaveText(FIRST_ROW.serviceName);
      await expect(logsExperience.serviceNameCell(2)).toHaveText(LAST_ROW.serviceName);
    });

    spaceTest(
      'should not render the service.name cell when the source is not logs',
      async ({ pageObjects }) => {
        const { dataGrid, discover, logsExperience, unifiedFieldList } = pageObjects;

        await logsExperience.gotoDataView(LOGS.NON_LOGS_FIELDS_DATA_VIEW);
        await unifiedFieldList.clickFieldListItemAdd(LOGS.SERVICE_NAME_FIELD);
        await discover.waitUntilTabIsLoaded();

        // Every non-logs document carries the same service name, so both ends of the grid show the
        // raw value. The FTR fixture varied it only because its index mixed logs and non-logs docs.
        await expect(dataGrid.getCellValue(0, LOGS.SERVICE_NAME_FIELD)).toHaveText(
          LOGS.NON_LOGS_SERVICE_NAME
        );
        await expect(dataGrid.getCellValue(2, LOGS.SERVICE_NAME_FIELD)).toHaveText(
          LOGS.NON_LOGS_SERVICE_NAME
        );
        await expect(logsExperience.serviceNameCells).toHaveCount(0);
      }
    );
  }
);
