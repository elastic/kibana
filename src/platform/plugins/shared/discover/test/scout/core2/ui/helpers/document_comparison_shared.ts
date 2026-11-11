/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { DiscoverPageObjects } from '../fixtures';
import { spaceTest } from '../fixtures';

const SELECTED_FIELD_NAMES = ['@timestamp', 'extension', 'bytes', '@message', 'agent'];
const EXTENSION_ROW_INDEX = 1;
const BYTES_ROW_INDEX = 2;

export interface ComparisonSuiteConfig {
  suiteName: string;
  comparisonDisplay: string;
  tableHeaders: string[];
  fullFieldNames: string[];
  setup: (pageObjects: DiscoverPageObjects) => Promise<void>;
}

export const runDocumentComparisonSuite = ({
  suiteName,
  comparisonDisplay,
  tableHeaders,
  fullFieldNames,
  setup,
}: ComparisonSuiteConfig) => {
  spaceTest.describe(
    `Discover — document comparison (${suiteName})`,
    { tag: '@local-stateful-classic' },
    () => {
      spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
        await discoverScoutSpace.setupDiscoverDefaults();
      });

      spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
        await browserAuth.loginAsPrivilegedUser();
        await setup(pageObjects);
        await pageObjects.dataGrid.waitForDocTableRendered();
      });

      spaceTest.afterAll(async ({ discoverScoutSpace }) => {
        await discoverScoutSpace.teardownDiscoverDefaults();
      });

      spaceTest(
        'allows comparing results and toggling comparison settings',
        async ({ page, pageObjects }) => {
          const { dataGrid, unifiedFieldList } = pageObjects;

          await spaceTest.step('selects two rows and enters comparison mode', async () => {
            await dataGrid.selectRow(0);
            expect(await dataGrid.compareSelectedButtonExists()).toBe(false);
            await dataGrid.selectRow(1);
            expect(await dataGrid.compareSelectedButtonExists()).toBe(true);
            await dataGrid.clickCompareSelectedButton();
            await expect(page.testSubj.locator('unifiedDataTableComparisonDisplay')).toHaveText(
              comparisonDisplay
            );
          });

          await spaceTest.step('shows comparison headers and allows selecting fields', async () => {
            const headers = await dataGrid.getColumnTitles(
              page.testSubj.locator('unifiedDataTableCompareDocuments')
            );
            expect(headers).toStrictEqual(tableHeaders);

            // aria-rowcount reflects all rows regardless of virtualization
            const totalFieldCount = await dataGrid.getComparisonFieldCount();
            expect(totalFieldCount).toBeGreaterThanOrEqual(fullFieldNames.length);
            // Verify the visible (DOM-rendered) rows are in the correct order
            const visibleFieldNames = await dataGrid.getComparisonFieldNames();
            expect(visibleFieldNames).toStrictEqual(
              fullFieldNames.slice(0, visibleFieldNames.length)
            );

            await dataGrid.openComparisonSettings();
            await expect(
              page.testSubj.locator('unifiedDataTableDiffOptionSwitch-showAllFields')
            ).toBeHidden();
            await page.keyboard.press('Escape');

            await unifiedFieldList.clickFieldListItemAdd('extension');
            await unifiedFieldList.clickFieldListItemAdd('bytes');
            await unifiedFieldList.clickFieldListItemAdd('@message');
            await unifiedFieldList.clickFieldListItemAdd('agent');

            // The comparison table re-renders as each column is added, so assert on the cells
            // themselves and let the assertion retry until the table has caught up.
            await expect(dataGrid.getComparisonFieldNameCells()).toHaveText(SELECTED_FIELD_NAMES);
          });

          await spaceTest.step('allows changing diff modes', async () => {
            await dataGrid.selectComparisonDiffMode('basic');
            let extensionRow = await dataGrid.getComparisonRow(EXTENSION_ROW_INDEX);
            expect(extensionRow.fieldName).toBe('extension');
            expect(extensionRow.values).toStrictEqual(['jpg', 'jpg']);
            let bytesRow = await dataGrid.getComparisonRow(BYTES_ROW_INDEX);
            expect(bytesRow.fieldName).toBe('bytes');
            expect(bytesRow.values).toStrictEqual(['7,124', '5,453']);

            await dataGrid.selectComparisonDiffMode('chars');
            extensionRow = await dataGrid.getComparisonRow(EXTENSION_ROW_INDEX);
            expect(extensionRow.values).toStrictEqual([
              'jpg',
              '<span class="unifiedDataTable__comparisonSegment">jpg</span>',
            ]);
            bytesRow = await dataGrid.getComparisonRow(BYTES_ROW_INDEX);
            expect(bytesRow.values).toStrictEqual([
              '7124',
              '<span class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonRemovedSegment">712</span>' +
                '<span class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonAddedSegment">5</span>' +
                '<span class="unifiedDataTable__comparisonSegment">4</span>' +
                '<span class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonAddedSegment">53</span>',
            ]);

            await dataGrid.selectComparisonDiffMode('words');
            extensionRow = await dataGrid.getComparisonRow(EXTENSION_ROW_INDEX);
            expect(extensionRow.values).toStrictEqual([
              'jpg',
              '<span class="unifiedDataTable__comparisonSegment">jpg</span>',
            ]);
            bytesRow = await dataGrid.getComparisonRow(BYTES_ROW_INDEX);
            expect(bytesRow.values).toStrictEqual([
              '7124',
              '<span class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonRemovedSegment">7124</span>' +
                '<span class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonAddedSegment">5453</span>',
            ]);

            await dataGrid.selectComparisonDiffMode('lines');
            extensionRow = await dataGrid.getComparisonRow(EXTENSION_ROW_INDEX);
            expect(extensionRow.values).toStrictEqual([
              'jpg',
              '<div class="unifiedDataTable__comparisonSegment">jpg</div>',
            ]);
            bytesRow = await dataGrid.getComparisonRow(BYTES_ROW_INDEX);
            expect(bytesRow.values).toStrictEqual([
              '7124',
              '<div class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonRemovedSegment">7124</div>' +
                '<div class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonAddedSegment">5453</div>',
            ]);
          });

          await spaceTest.step('allows toggling show diff switch', async () => {
            await dataGrid.toggleShowDiffSwitch();
            const extensionRow = await dataGrid.getComparisonRow(EXTENSION_ROW_INDEX);
            expect(extensionRow.values).toStrictEqual(['jpg', 'jpg']);
            const bytesRow = await dataGrid.getComparisonRow(BYTES_ROW_INDEX);
            expect(bytesRow.values).toStrictEqual(['7,124', '5,453']);
            await dataGrid.toggleShowDiffSwitch();
          });

          await spaceTest.step('allows toggling all fields', async () => {
            await dataGrid.selectComparisonDiffMode('basic');
            await dataGrid.toggleShowAllFieldsSwitch();
            const totalFieldCount = await dataGrid.getComparisonFieldCount();
            expect(totalFieldCount).toBeGreaterThanOrEqual(fullFieldNames.length);
            await dataGrid.toggleShowAllFieldsSwitch();
          });

          await spaceTest.step('allows toggling matching values', async () => {
            let fieldNames = await dataGrid.getComparisonFieldNames();
            expect(fieldNames).toHaveLength(SELECTED_FIELD_NAMES.length);
            await dataGrid.toggleShowMatchingValuesSwitch();
            fieldNames = await dataGrid.getComparisonFieldNames();
            expect(fieldNames).toHaveLength(SELECTED_FIELD_NAMES.length - 1);
            expect(fieldNames).toStrictEqual(
              SELECTED_FIELD_NAMES.filter((name) => name !== 'extension')
            );
            await dataGrid.toggleShowMatchingValuesSwitch();
          });

          await spaceTest.step('allows toggling diff decorations', async () => {
            await dataGrid.selectComparisonDiffMode('words');
            let diffSegments = await dataGrid.getComparisonDiffSegments(BYTES_ROW_INDEX, 2);
            expect(diffSegments).toStrictEqual([
              { decoration: 'removed', value: '7124' },
              { decoration: 'added', value: '5453' },
            ]);
            await dataGrid.toggleShowDiffDecorationsSwitch();
            diffSegments = await dataGrid.getComparisonDiffSegments(BYTES_ROW_INDEX, 2);
            expect(diffSegments).toStrictEqual([
              { decoration: undefined, value: '7124' },
              { decoration: undefined, value: '5453' },
            ]);
            await dataGrid.toggleShowDiffDecorationsSwitch();
          });

          await spaceTest.step('allows exiting comparison mode', async () => {
            await dataGrid.exitComparisonMode();
            await dataGrid.waitForLoad();
          });
        }
      );
    }
  );
};
