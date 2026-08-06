/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Clicking an ES|QL aggregation table cell appends a `WHERE`/`AND` clause to
 * the query (in Discover) or adds a filter pill (embedded in a Dashboard
 * panel), without disturbing the chart's visualization type/state.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import type { PageObjects } from '@kbn/scout';
import { spaceTest } from '../../fixtures';

const AGG_QUERY =
  'from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB';

/**
 * Submits an ES|QL aggregation query and opts out of the default "cascade
 * layout" grouping, so the result can be read/filtered as a flat grid.
 */
const submitAggQueryAsFlatGrid = async (discover: PageObjects['discover'], query: string) => {
  await discover.codeEditor.setCodeEditorValue(query);
  await discover.submitQuery();
  await discover.waitUntilTabIsLoaded();
  await discover.optOutOfCascadeGrouping();
};

spaceTest.describe(
  'Discover ES|QL view - filter by clicking the table',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.use({ viewport: { width: 1600, height: 1200 } });

    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('appends a WHERE clause when clicking a table cell', async ({ pageObjects }) => {
      const { discover, dataGrid } = pageObjects;

      await submitAggQueryAsFlatGrid(discover, AGG_QUERY);

      await dataGrid.clickCellFilterFor(0, 'geo.dest');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.codeEditor.getCodeEditorValue()).toBe(
        `${AGG_QUERY}\n| WHERE \`geo.dest\` == "BT"`
      );

      await dataGrid.clickCellFilterOut(0, 'geo.dest');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.codeEditor.getCodeEditorValue()).toBe(
        `${AGG_QUERY}\n| WHERE \`geo.dest\`!= "BT"`
      );
    });

    spaceTest('appends an AND clause to an existing WHERE clause', async ({ pageObjects }) => {
      const { discover, dataGrid } = pageObjects;
      const query = `${AGG_QUERY} | where countB > 0`;

      await submitAggQueryAsFlatGrid(discover, query);

      await dataGrid.clickCellFilterFor(0, 'geo.dest');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.codeEditor.getCodeEditorValue()).toBe(
        `${query}\nAND \`geo.dest\` == "BT"`
      );
    });

    spaceTest(
      'appends a WHERE clause without resetting a manually chosen chart type',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await submitAggQueryAsFlatGrid(discover, AGG_QUERY);

        await discover.openLensEditFlyout();
        await page.testSubj.click('lnsChartSwitchPopover');
        await page.testSubj.click('lnsChartSwitchPopover_line');
        await page.testSubj.click('applyFlyoutButton');

        await pageObjects.dataGrid.clickCellFilterFor(0, 'geo.dest');
        await discover.waitUntilTabIsLoaded();
        expect(await discover.codeEditor.getCodeEditorValue()).toBe(
          `${AGG_QUERY}\n| WHERE \`geo.dest\` == "BT"`
        );

        await discover.openLensEditFlyout();
        const chartSwitcher = page.testSubj.locator('lnsChartSwitchPopover');
        await expect(chartSwitcher).toHaveText('Line');
      }
    );

    spaceTest(
      'appends a WHERE clause without resetting a manually chosen chart type nor a manually chosen series color',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;
        const customColor = '#ff0000';

        await submitAggQueryAsFlatGrid(discover, AGG_QUERY);

        await discover.openLensEditFlyout();
        await page.testSubj.click('lnsChartSwitchPopover');
        await page.testSubj.click('lnsChartSwitchPopover_line');

        // Customize the Y-axis series color.
        await page.testSubj.click('lnsXY_yDimensionPanel');
        const colorPickerInput = page.testSubj.locator('~indexPattern-dimension-colorPicker');
        await colorPickerInput.clear();
        await colorPickerInput.pressSequentially(customColor);
        await page.keyboard.press('Tab');
        await expect(colorPickerInput).toHaveValue(customColor.toUpperCase());
        await page.testSubj.click('lns-indexPattern-dimensionContainerClose');
        await page.testSubj.click('applyFlyoutButton');

        await pageObjects.dataGrid.clickCellFilterFor(0, 'geo.dest');
        await discover.waitUntilTabIsLoaded();
        expect(await discover.codeEditor.getCodeEditorValue()).toBe(
          `${AGG_QUERY}\n| WHERE \`geo.dest\` == "BT"`
        );

        // The chart type and the custom series color both survive the
        // programmatic query edit.
        await discover.openLensEditFlyout();
        const chartSwitcher = page.testSubj.locator('lnsChartSwitchPopover');
        await expect(chartSwitcher).toHaveText('Line');

        await page.testSubj.click('lnsXY_yDimensionPanel');
        await expect(colorPickerInput).toHaveValue(customColor.toUpperCase());
      }
    );

    spaceTest(
      'adds a filter pill (instead of a WHERE clause) when clicking a table cell embedded in a dashboard',
      async ({ page, pageObjects }) => {
        const { discover, dashboard, filterBar } = pageObjects;
        const savedSearchName = 'esql filter from table';

        await submitAggQueryAsFlatGrid(discover, AGG_QUERY);
        await discover.saveSearch(savedSearchName);
        await discover.waitUntilTabIsLoaded();

        await dashboard.goto();
        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(savedSearchName);
        await dashboard.waitForRenderComplete();

        await pageObjects.dataGrid.clickCellFilterFor(0, 'geo.dest');
        await expect.poll(() => filterBar.getFilterCount()).toBe(1);

        // Clicking a non-filterable (aggregate value) cell shouldn't add another pill.
        const countCell = pageObjects.dataGrid.getCell(0, 'countB');
        await countCell.hover();
        await expect(page.testSubj.locator('filterForButton')).toBeHidden();
        expect(await filterBar.getFilterCount()).toBe(1);
      }
    );
  }
);
