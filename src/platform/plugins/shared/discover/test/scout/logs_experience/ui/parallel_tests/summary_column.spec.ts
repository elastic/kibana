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

/** The logs profile renders its summary in place of the `_source` column. */
const SUMMARY_COLUMN_ID = '_source';

spaceTest.describe(
  'Logs profile - Summary column',
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

    spaceTest('should render the summary content in ES|QL mode', async ({ pageObjects }) => {
      const { discover, dataGrid } = pageObjects;

      // Scoped to the seeded dataset and explicitly sorted so row 0 is deterministic.
      await discover.goto({ queryMode: 'esql' });
      await discover.writeAndSubmitEsqlQuery(
        `from ${LOGS.SYNTH_LOGS_DATA_VIEW} | sort @timestamp desc | limit 1`
      );

      const summaryCell = dataGrid.getCellValue(0, SUMMARY_COLUMN_ID);
      await expect(summaryCell).toContainText(LOGS.SYNTH_LOGS_HOST);
      await expect(summaryCell).toContainText(LOGS.SYNTH_LOGS_MESSAGE);
    });

    spaceTest(
      'should render Summary as a default column in data view mode',
      async ({ pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(LOGS.SYNTH_LOGS_DATA_VIEW);
        await discover.waitUntilTabIsLoaded();

        // Summary is contributed by the logs profile as a default column.
        await expect.poll(() => dataGrid.getColumnTitles()).toContain('Summary');

        const summaryCell = dataGrid.getCellValue(0, SUMMARY_COLUMN_ID);
        await expect(summaryCell).toContainText(LOGS.SYNTH_LOGS_HOST);
        await expect(summaryCell).toContainText(LOGS.SYNTH_LOGS_MESSAGE);
      }
    );

    spaceTest(
      'should format a computed ES|QL column in the summary the same as its own column',
      async ({ pageObjects }) => {
        const { discover, dataGrid, unifiedFieldList } = pageObjects;

        // `drop message` forces the summary to fall back to the remaining fields, so the
        // computed column is what it renders.
        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${LOGS.SYNTH_LOGS_DATA_VIEW} | sort @timestamp desc | limit 1 ` +
            `| eval custom_bytes = network.bytes * 2 | drop message`
        );

        // `getCell` rather than `getCellValue`: without `message` the summary renders more than
        // one value wrapper, so the inner `.unifiedDataTable__cellValue` locator is not unique.
        const summaryText = await dataGrid.getCell(0, SUMMARY_COLUMN_ID).innerText();

        await unifiedFieldList.clickFieldListItemAdd('custom_bytes');
        await discover.waitUntilTabIsLoaded();
        const columnText = await dataGrid.getCell(0, 'custom_bytes').innerText();

        const formattedValue = columnText.match(/\d{1,3},\d{3}/)?.[0];
        expect(formattedValue).toBeDefined();

        expect(summaryText).toContain(formattedValue);
      }
    );

    spaceTest(
      'should NOT render the summary in ES|QL mode if the source does not match logs',
      async ({ pageObjects }) => {
        const { dataGrid, logsExperience } = pageObjects;

        // These documents have a `message` field of their own, so the absence below is down to the
        // profile not claiming the source rather than to there being nothing to summarize.
        await logsExperience.gotoEsqlQuery(LOGS.NON_LOGS_FIELDS_ESQL_QUERY);

        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
        await expect(logsExperience.summaryMessageValues).toHaveCount(0);
      }
    );

    spaceTest(
      'should NOT render the summary in data view mode if the source does not match logs',
      async ({ apiServices, scoutSpace, pageObjects }) => {
        const { dataGrid, discover, logsExperience } = pageObjects;

        const sessionId = await createNonLogsDiscoverSession(
          apiServices,
          scoutSpace.id,
          'non-logs-summary',
          LOGS.NON_LOGS_FIELDS_DATA_VIEW
        );

        // Opened by id: the "Open search" flyout filters via a saved-object search, which lags the write.
        await discover.goto({ queryMode: 'classic', savedSearchId: sessionId });
        await discover.waitUntilTabIsLoaded();

        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
        await expect(logsExperience.summaryMessageValues).toHaveCount(0);
      }
    );
  }
);
