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
  'Logs profile - Cell renderers in ES|QL mode (getCellRenderers)',
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

    spaceTest('should render the log.level badge cell', async ({ pageObjects }) => {
      const { discover, logsExperience, unifiedFieldList } = pageObjects;

      await logsExperience.gotoEsqlQuery(LOGS.SYNTH_CONTEXT_ESQL_QUERY);
      await unifiedFieldList.clickFieldListItemAdd(LOGS.LOG_LEVEL_FIELD);
      await discover.waitUntilTabIsLoaded();

      const badge = logsExperience.logLevelBadge(0, FIRST_ROW.logLevel);
      await expect(badge).toBeVisible();
      await expect(badge).toHaveText(FIRST_ROW.logLevel);
    });

    spaceTest(
      'should not render the log.level badge cell when the source is not logs',
      async ({ pageObjects }) => {
        const { dataGrid, discover, logsExperience, unifiedFieldList } = pageObjects;

        await logsExperience.gotoEsqlQuery(LOGS.NON_LOGS_FIELDS_ESQL_QUERY);
        await unifiedFieldList.clickFieldListItemAdd(LOGS.LOG_LEVEL_FIELD);
        await discover.waitUntilTabIsLoaded();

        // The value is still rendered, just not as a badge.
        await expect(dataGrid.getCellValue(0, LOGS.LOG_LEVEL_FIELD)).toHaveText(
          LOGS.NON_LOGS_LOG_LEVEL
        );
        await expect(logsExperience.logLevelBadges).toHaveCount(0);
      }
    );

    spaceTest('should render the service.name cell', async ({ pageObjects }) => {
      const { discover, logsExperience, unifiedFieldList } = pageObjects;

      await logsExperience.gotoEsqlQuery(LOGS.SYNTH_CONTEXT_ESQL_QUERY);
      await unifiedFieldList.clickFieldListItemAdd(LOGS.SERVICE_NAME_FIELD);
      await discover.waitUntilTabIsLoaded();

      await expect(logsExperience.serviceNameCell(0)).toHaveText(FIRST_ROW.serviceName);
      await expect(logsExperience.serviceNameCell(2)).toHaveText(LAST_ROW.serviceName);
    });

    spaceTest(
      'should not render the service.name cell when the source is not logs',
      async ({ pageObjects }) => {
        const { dataGrid, discover, logsExperience, unifiedFieldList } = pageObjects;

        await logsExperience.gotoEsqlQuery(LOGS.NON_LOGS_FIELDS_ESQL_QUERY);
        await unifiedFieldList.clickFieldListItemAdd(LOGS.SERVICE_NAME_FIELD);
        await discover.waitUntilTabIsLoaded();

        await expect(dataGrid.getCellValue(0, LOGS.SERVICE_NAME_FIELD)).toHaveText(
          LOGS.NON_LOGS_SERVICE_NAME
        );
        await expect(logsExperience.serviceNameCells).toHaveCount(0);
      }
    );
  }
);
