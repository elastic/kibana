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

/** The logs profile renders its summary in place of the `_source` column. */
const SUMMARY_COLUMN_ID = '_source';

/** Resource badge value and message fragment from the dataset seeded in global setup. */
const EXPECTED_HOST = 'synth-host';
const EXPECTED_MESSAGE = 'Test log message';

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
        `from logs-${LOGS.SYNTH_LOGS_DATASET}-* | sort @timestamp desc | limit 1`
      );

      const summaryCell = dataGrid.getCellValue(0, SUMMARY_COLUMN_ID);
      await expect(summaryCell).toContainText(EXPECTED_HOST);
      await expect(summaryCell).toContainText(EXPECTED_MESSAGE);
    });

    spaceTest(
      'should render Summary as a default column in data view mode',
      async ({ pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(LOGS.ALL_LOGS_DATA_VIEW);
        await discover.waitUntilTabIsLoaded();

        // Summary is contributed by the logs profile as a default column.
        expect(await dataGrid.getColumnTitles()).toContain('Summary');

        const summaryCell = dataGrid.getCellValue(0, SUMMARY_COLUMN_ID);
        await expect(summaryCell).toContainText(EXPECTED_HOST);
        await expect(summaryCell).toContainText(EXPECTED_MESSAGE);
      }
    );
  }
);
