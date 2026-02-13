/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, expect, tags } from '../../../../../src/playwright';
import { EuiDataGridWrapper } from '../../../../../src/playwright/eui_components';
import { navigateToEuiTestPage } from '../../../fixtures/eui_helpers';

// Failing: See https://github.com/elastic/kibana/issues/242430
test.describe.skip(
  'EUI testing wrapper: EuiDataGrid',
  { tag: [...tags.serverless.security.complete, ...tags.stateful.classic] },
  () => {
    test(`data grid, run`, async ({ page, log }) => {
      const selector = {
        locator: '.euiDataGrid',
      };
      await navigateToEuiTestPage(page, 'docs/components/data-grid/#core-concepts', log);

      await test.step('should return column names', async () => {
        const dataGrid = new EuiDataGridWrapper(page, selector);
        expect(await dataGrid.getColumnsNames()).toStrictEqual([
          'Name',
          'Email address',
          'Location',
          'Account',
          'Date',
          'Amount',
          'Phone',
          'Version',
        ]);
      });

      await test.step('should return rows count', async () => {
        const dataGrid = new EuiDataGridWrapper(page, selector);
        expect(await dataGrid.getRowsCount()).toBe(10);
      });

      await test.step('should open context menu and hide column', async () => {
        const dataGrid = new EuiDataGridWrapper(page, selector);
        await dataGrid.doActionOnColumn('Location', 'Hide column');
        expect(await dataGrid.getColumnsNames()).toStrictEqual([
          'Name',
          'Email address',
          'Account',
          'Date',
          'Amount',
          'Phone',
          'Version',
        ]);
      });

      await test.step('should open/close full screen mode', async () => {
        const dataGrid = new EuiDataGridWrapper(page, selector);
        await dataGrid.openFullScreenMode();
        expect(await dataGrid.getColumnsNames()).toStrictEqual([
          'Name',
          'Email address',
          'Account',
          'Date',
          'Amount',
          'Phone',
          'Version',
        ]);
        await dataGrid.closeFullScreenMode();
      });

      await test.step('should expand the cell', async () => {
        const dataGrid = new EuiDataGridWrapper(page, selector);
        await dataGrid.expandCell(3, 2);
        await expect(
          page.testSubj.locator('euiDataGridExpansionPopover'),
          'Expansion popover should be visible'
        ).toBeVisible();
      });
    });
  }
);
