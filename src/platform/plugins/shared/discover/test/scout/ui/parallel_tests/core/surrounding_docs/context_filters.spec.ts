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
  testData,
  addFilterWithoutStrictCheck,
  resolveDataViewId,
} from '../../../fixtures/surrounding_docs';

const TEST_ANCHOR_FILTER_FIELD = testData.FILTER_FIELD_GEO_SRC;
const TEST_ANCHOR_FILTER_VALUE = testData.FILTER_VALUE_GEO_SRC_IN;
const TEST_COLUMN_NAMES = testData.FILTER_COLUMNS;

spaceTest.describe(
  'Discover context - filters (basic)',
  { tag: testData.CONTEXT_DEPLOYMENT_AGNOSTIC_TAGS },
  () => {
    spaceTest.use({ viewport: { width: 1600, height: 1200 } });

    let dataViewId: string;

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_VISUALIZE);
      dataViewId = resolveDataViewId(imported, testData.LOGSTASH_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultIndex(testData.LOGSTASH_DATA_VIEW);
      await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.contextPage.navigateTo(dataViewId, testData.LOGSTASH_ANCHOR_ID, {
        columns: TEST_COLUMN_NAMES,
      });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'discover:rowHeightOption');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'inclusive filter should be addable via expanded data grid rows',
      async ({ pageObjects }) => {
        await pageObjects.contextPage.openAnchorDocViewer();
        await pageObjects.discover.findFieldByNameOrValueInDocViewer(TEST_ANCHOR_FILTER_FIELD);
        await pageObjects.discover.clickFieldActionInFlyout(
          TEST_ANCHOR_FILTER_FIELD,
          'addFilterForValueButton'
        );
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_ANCHOR_FILTER_FIELD,
            value: TEST_ANCHOR_FILTER_VALUE,
            enabled: true,
          })
        ).toBe(true);

        await pageObjects.discover.closeDocViewerFlyout();

        const fields = await pageObjects.discover.getDataGridRows();
        expect(fields.map((row) => row[2]).every((v) => v === TEST_ANCHOR_FILTER_VALUE)).toBe(true);
      }
    );

    spaceTest(
      'inclusive filter should be toggleable via the filter bar',
      async ({ pageObjects }) => {
        await pageObjects.filterBar.addFilter({
          field: TEST_ANCHOR_FILTER_FIELD,
          operator: 'is',
          value: TEST_ANCHOR_FILTER_VALUE,
        });
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await pageObjects.filterBar.toggleFilterEnabled(TEST_ANCHOR_FILTER_FIELD);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_ANCHOR_FILTER_FIELD,
            value: TEST_ANCHOR_FILTER_VALUE,
            enabled: false,
          })
        ).toBe(true);

        const fields = await pageObjects.discover.getDataGridRows();
        expect(fields.map((row) => row[2]).every((v) => v === TEST_ANCHOR_FILTER_VALUE)).toBe(
          false
        );
      }
    );

    spaceTest(
      'filter for presence should be addable via expanded data grid rows',
      async ({ pageObjects }) => {
        await pageObjects.contextPage.openAnchorDocViewer();
        await pageObjects.discover.findFieldByNameOrValueInDocViewer(TEST_ANCHOR_FILTER_FIELD);
        await pageObjects.discover.clickFieldActionInFlyout(
          TEST_ANCHOR_FILTER_FIELD,
          'addExistsFilterButton'
        );
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_ANCHOR_FILTER_FIELD,
            value: 'exists',
            enabled: true,
          })
        ).toBe(true);
      }
    );

    spaceTest(
      'should preserve filters when the page is refreshed',
      async ({ page, pageObjects }) => {
        await pageObjects.filterBar.addFilter({
          field: TEST_ANCHOR_FILTER_FIELD,
          operator: 'is',
          value: TEST_ANCHOR_FILTER_VALUE,
        });
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await pageObjects.filterBar.toggleFilterPinned(TEST_ANCHOR_FILTER_FIELD);

        await addFilterWithoutStrictCheck(page, 'extension', 'png');
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(await pageObjects.filterBar.getFilterCount()).toBe(2);
        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_ANCHOR_FILTER_FIELD,
            value: TEST_ANCHOR_FILTER_VALUE,
            enabled: true,
            pinned: true,
          })
        ).toBe(true);
        expect(
          await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'png', enabled: true })
        ).toBe(true);

        const fields = await pageObjects.discover.getDataGridRows();
        expect(fields.every((row) => row[1] === 'png' && row[2] === TEST_ANCHOR_FILTER_VALUE)).toBe(
          true
        );

        await page.reload();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(await pageObjects.filterBar.getFilterCount()).toBe(2);
        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_ANCHOR_FILTER_FIELD,
            value: TEST_ANCHOR_FILTER_VALUE,
            enabled: true,
            pinned: true,
          })
        ).toBe(true);
        expect(
          await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'png', enabled: true })
        ).toBe(true);

        const fieldsAfterRefresh = await pageObjects.discover.getDataGridRows();
        expect(
          fieldsAfterRefresh.every((row) => row[1] === 'png' && row[2] === TEST_ANCHOR_FILTER_VALUE)
        ).toBe(true);
      }
    );

    spaceTest(
      'should update filters when navigating forward and backward in history',
      async ({ page, pageObjects }) => {
        await pageObjects.filterBar.addFilter({
          field: 'extension',
          operator: 'is',
          value: 'png',
        });
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        expect(await pageObjects.filterBar.getFilterCount()).toBe(1);
        expect(
          await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'png', enabled: true })
        ).toBe(true);

        const fieldsWithFilter = await pageObjects.discover.getDataGridRows();
        expect(fieldsWithFilter.every((row) => row[1] === 'png')).toBe(true);

        await page.goBack();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();
        expect(await pageObjects.filterBar.getFilterCount()).toBe(0);

        const fieldsWithoutFilter = await pageObjects.discover.getDataGridRows();
        expect(fieldsWithoutFilter.every((row) => row[1] === 'png')).toBe(false);

        await page.goForward();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();
        expect(await pageObjects.filterBar.getFilterCount()).toBe(1);

        expect(
          await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'png', enabled: true })
        ).toBe(true);

        const fieldsRestored = await pageObjects.discover.getDataGridRows();
        expect(fieldsRestored.every((row) => row[1] === 'png')).toBe(true);
      }
    );
  }
);
