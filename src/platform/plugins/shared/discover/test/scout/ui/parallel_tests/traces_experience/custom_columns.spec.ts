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

const EXPECTED_COLUMNS = [
  '@timestamp',
  'service.name',
  'transaction.name',
  'span.name',
  'transaction.duration.us',
  'span.duration.us',
  'event.outcome',
];

spaceTest.describe(
  'Traces in Discover - Custom columns',
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

    spaceTest(
      'should display trace-specific columns in data view mode',
      async ({ page, pageObjects }) => {
        await spaceTest.step('wait for results to load', async () => {
          await pageObjects.discover.waitForDocTableRendered();
        });

        await spaceTest.step('verify trace-specific column headers', async () => {
          for (const column of EXPECTED_COLUMNS) {
            await expect(page.testSubj.locator(`dataGridHeaderCell-${column}`)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'should display trace-specific columns in ESQL mode',
      async ({ page, pageObjects }) => {
        // Using this step to switch to a different index pattern because
        // navigating directly to the ESQL mode from the classic mode
        // resets the data table columns to the default columns.
        await spaceTest.step('switch to ESQL mode with a different index pattern', async () => {
          await pageObjects.discover.writeEsqlQuery('FROM traces-*');
        });

        // By triggering a new query with the intended index pattern,
        // we can ensure the data table columns are resolved loaded correctly.
        await spaceTest.step('change to traces-apm* to trigger profile columns', async () => {
          await pageObjects.discover.updateEsqlQuery(TRACES.ESQL_QUERY);
        });

        await spaceTest.step('verify trace-specific column headers', async () => {
          for (const column of EXPECTED_COLUMNS) {
            await expect(page.testSubj.locator(`dataGridHeaderCell-${column}`)).toBeVisible();
          }
        });
      }
    );
  }
);
