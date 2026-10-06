/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Data-grid JSON view: switching the documents display mode, reload persistence, and filtering
 * the JSON to the selected columns. The JSON cells and the JSON display settings are scanned for
 * a11y violations.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '../fixtures';

const DOC_TABLE_TEST_SUBJ = 'discoverDocTable';
const DISPLAY_POPOVER_TEST_SUBJ = 'dataGridDisplaySelectorPopover';
const DENSITY_BUTTON_GROUP_TEST_SUBJ = 'densityButtonGroup';
const ROW_HEIGHT_BUTTON_GROUP_TEST_SUBJ = 'unifiedDataTableRowHeightSettings_rowHeightButtonGroup';
const RENDERED_NODES_SETTINGS_TEST_SUBJ = 'unifiedDataTableRenderedNodesSettings';
const HIDE_NULLS_SETTINGS_TEST_SUBJ = 'unifiedDataTableHideNullsSettings';
const WRAP_LINES_SETTINGS_TEST_SUBJ = 'unifiedDataTableWrapLinesSettings';
const FILTER_FOR_EXTENSION_TEST_SUBJ = 'jsonTreeViewerFilterFor-extension';

spaceTest.describe('Discover data grid JSON view', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    // Popovers animate in; axe can otherwise scan a half-rendered frame.
    await discoverScoutSpace.uiSettings.set({ 'accessibility:disableAnimations': true });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    const { discover, dataGrid } = pageObjects;

    await browserAuth.loginAsViewer();
    await discover.goto({ queryMode: 'classic' });
    await dataGrid.waitForDocTableRendered();
    await discover.writeAndSubmitKqlQuery('extension : * and bytes : * and machine.os : *');
    await dataGrid.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.uiSettings.unset('accessibility:disableAnimations');
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'switches the documents between the table and JSON views',
    async ({ page, pageObjects }) => {
      const { dataGrid } = pageObjects;

      await spaceTest.step('switch to the JSON view', async () => {
        await dataGrid.setDocumentsDisplayMode('JSON');

        await expect.poll(() => dataGrid.getColumnTitles()).toStrictEqual(['@timestamp', 'JSON']);
        await expect(dataGrid.getJsonTreeItem(0, 'extension')).toBeVisible();

        // Hovering a field mounts its copy and filter actions, so they are scanned too.
        await dataGrid.getJsonTreeItem(0, 'extension').hover();
        await expect(
          dataGrid.getCell(0, '_source').getByTestId(FILTER_FOR_EXTENSION_TEST_SUBJ)
        ).toBeVisible();

        const { violations } = await page.checkA11y({
          include: [
            `[data-test-subj="${DOC_TABLE_TEST_SUBJ}"] [data-gridcell-column-id="_source"]`,
          ],
        });
        expect(violations).toStrictEqual([]);
      });

      await spaceTest.step('show the JSON settings instead of the row settings', async () => {
        await dataGrid.openGridDisplaySettings();

        expect(await dataGrid.getCurrentDocumentsDisplayMode()).toBe('JSON');
        await expect(page.getByTestId(RENDERED_NODES_SETTINGS_TEST_SUBJ)).toBeVisible();
        await expect(page.getByTestId(HIDE_NULLS_SETTINGS_TEST_SUBJ)).toBeVisible();
        await expect(page.getByTestId(WRAP_LINES_SETTINGS_TEST_SUBJ)).toBeVisible();
        await expect(page.getByTestId(DENSITY_BUTTON_GROUP_TEST_SUBJ)).toBeHidden();
        await expect(page.getByTestId(ROW_HEIGHT_BUTTON_GROUP_TEST_SUBJ)).toBeHidden();

        const { violations } = await page.checkA11y({
          include: [`[data-test-subj="${DISPLAY_POPOVER_TEST_SUBJ}"]`],
        });
        expect(violations).toStrictEqual([]);
      });

      await spaceTest.step('switch back to the table view', async () => {
        await dataGrid.setDocumentsDisplayMode('Table');

        await expect
          .poll(() => dataGrid.getColumnTitles())
          .toStrictEqual(['@timestamp', 'Summary']);
        await expect(dataGrid.getDocumentColumnFieldValue(0, 'extension')).toBeVisible();
        await expect(dataGrid.getJsonTreeItem(0, 'extension')).toBeHidden();
      });
    }
  );

  spaceTest('persists the JSON view after reloading the page', async ({ page, pageObjects }) => {
    const { dataGrid } = pageObjects;

    await dataGrid.setDocumentsDisplayMode('JSON');
    await expect(dataGrid.getJsonTreeItem(0, 'extension')).toBeVisible();

    await page.reload();
    await dataGrid.waitForDocTableRendered();

    await expect.poll(() => dataGrid.getColumnTitles()).toStrictEqual(['@timestamp', 'JSON']);
    await expect(dataGrid.getJsonTreeItem(0, 'extension')).toBeVisible();
    await dataGrid.openGridDisplaySettings();
    expect(await dataGrid.getCurrentDocumentsDisplayMode()).toBe('JSON');
  });

  spaceTest('filters the JSON to the selected columns', async ({ pageObjects }) => {
    const { dataGrid, unifiedFieldList } = pageObjects;

    await dataGrid.setDocumentsDisplayMode('JSON');
    await expect(dataGrid.getJsonTreeItem(0, 'bytes')).toBeVisible();

    await spaceTest.step('select columns while in the JSON view', async () => {
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await unifiedFieldList.clickFieldListItemAdd('machine.os');

      await expect(dataGrid.getJsonTreeItem(0, 'extension')).toBeVisible();
      await expect(dataGrid.getJsonTreeItem(0, 'machine.os')).toBeVisible();
      await expect(dataGrid.getJsonTreeItem(0, 'bytes')).toBeHidden();
      await expect.poll(() => dataGrid.getColumnTitles()).toStrictEqual(['@timestamp', 'JSON']);
    });

    await spaceTest.step('show the selected columns in the table view', async () => {
      await dataGrid.setDocumentsDisplayMode('Table');

      await expect
        .poll(() => dataGrid.getColumnTitles())
        .toStrictEqual(['@timestamp', 'extension', 'machine.os']);
    });
  });
});
