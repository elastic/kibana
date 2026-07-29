/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Smoke test for ES|QL results formatting via `columnsMeta`: when an ES|QL
 * column shares its name with a data-view field but has a different type
 * (here `DistanceMiles` is numeric in the `kibana_sample_data_flights` data
 * view but a string array in the query), the value must be formatted from the
 * ES|QL `columnsMeta` rather than the data-view field format — in the Summary
 * column, an added column, and the doc-viewer flyout.
 *
 * Migrated from `src/platform/test/functional/apps/discover/esql_1/_esql_formatting.ts`.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

// Extra columns (col1–col5) push the result past the table-view column
// threshold so the grid renders the Summary column.
const COLUMNS_META_QUERY =
  'ROW DistanceMiles = ["w1", "w2", "w3"], recent = ["w1", "w3"], col1 = 1, col2 = 2, col3 = 3, col4 = 4, col5 = 5 | EVAL DistanceMiles = COALESCE(recent, DistanceMiles)';

// The COALESCE result: the ES|QL string-array value, not a numeric format.
const EXPECTED_VALUE = '[w1, w3]';

spaceTest.describe(
  'Discover ES|QL results formatting with columnsMeta',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      // Load the flights data view so a numeric `DistanceMiles` field format
      // exists — that is what the ES|QL columnsMeta format must override.
      await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'formats ES|QL columns using columnsMeta when the type differs from the data-view field',
      async ({ page, pageObjects }) => {
        const { discover, dataGrid, unifiedFieldList } = pageObjects;

        await discover.writeAndSubmitEsqlQuery(COLUMNS_META_QUERY);

        await spaceTest.step('Summary column shows the string-array values', async () => {
          await expect(dataGrid.getDocumentColumnFieldValue(0, 'recent')).toHaveText(
            EXPECTED_VALUE
          );
          await expect(dataGrid.getDocumentColumnFieldValue(0, 'DistanceMiles')).toHaveText(
            EXPECTED_VALUE
          );
        });

        await spaceTest.step(
          'added DistanceMiles column shows the string-array value',
          async () => {
            await unifiedFieldList.clickFieldListItemAdd('DistanceMiles');
            await discover.waitUntilTabIsLoaded();
            await expect(dataGrid.getCellValue(0, 'DistanceMiles')).toHaveText(EXPECTED_VALUE);
          }
        );

        await spaceTest.step('doc-viewer flyout shows the string-array value', async () => {
          await dataGrid.openDocumentDetails({ rowIndex: 0 });
          expect(await discover.isShowingDocViewer()).toBe(true);
          await expect(page.testSubj.locator('tableDocViewRow-DistanceMiles-value')).toHaveText(
            EXPECTED_VALUE
          );
        });
      }
    );
  }
);
