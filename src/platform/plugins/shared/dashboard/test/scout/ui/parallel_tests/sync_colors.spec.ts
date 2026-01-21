/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugState } from '@elastic/charts';
import chroma from 'chroma-js';
import { spaceTest, expect, tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';

const KIBANA_ARCHIVE_PATH =
  'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json';

const getColorMapping = (debugState: DebugState | null) => {
  const colorMapping: Record<string, string> = {};
  debugState?.bars?.forEach(({ name, color }) => {
    colorMapping[name] = color;
  });
  return colorMapping;
};

declare global {
  interface Window {
    _echDebugStateFlag?: boolean;
  }
}

const getChartDebugState = async (page: ScoutPage, panelIndex: number) => {
  const charts = await page.locator('.echChart').all();
  const chart = charts[panelIndex];
  const status = chart.locator('.echChartStatus');
  const debugState = await status.getAttribute('data-ech-debug-state');
  const parsed = debugState && (JSON.parse(debugState) as DebugState);
  return parsed ?? null;
};

// eslint-disable-next-line playwright/no-skipped-test
spaceTest.describe.skip('Sync colors', { tag: tags.ESS_ONLY }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(KIBANA_ARCHIVE_PATH);
  });

  spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await page.addInitScript(() => {
      window._echDebugStateFlag = true;
    });
    await pageObjects.dashboard.goto();
    await pageObjects.dashboard.openNewDashboard();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should sync colors on dashboard for legacy default palette',
    async ({ page, pageObjects, pageObjects: { filterBar } }) => {
      await spaceTest.step('create non-filtered xy chart', async () => {
        await pageObjects.dashboard.openAddPanelFlyout();
        await page.testSubj.click('create-action-Lens');
        await page.testSubj.waitForSelector('lnsApp', { state: 'visible' });

        await page.testSubj.click('lnsXY_yDimensionPanel > lns-empty-dimension');
        await page.testSubj.click('lns-indexPatternDimension-count');
        await page.testSubj.click('lns-indexPattern-dimensionContainerClose');

        await page.testSubj.click('lnsXY_splitDimensionPanel > lns-empty-dimension');
        await page.testSubj.click('lns-indexPatternDimension-terms');
        await page.testSubj.click('indexPattern-dimension-field');
        await page.testSubj.typeWithDelay(
          'indexPattern-dimension-field > comboBoxSearchInput',
          'geo.src'
        );
        await page.locator('.euiComboBoxOption__content:has-text("geo.src")').click();
        await page.testSubj.click('lns-indexPattern-dimensionContainerClose');

        await pageObjects.lens.saveAndReturn();
        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step('create filtered xy chart', async () => {
        await pageObjects.dashboard.openAddPanelFlyout();
        await page.testSubj.click('create-action-Lens');
        await page.testSubj.waitForSelector('lnsApp', { state: 'visible' });

        await page.testSubj.click('lnsXY_yDimensionPanel > lns-empty-dimension');
        await page.testSubj.click('lns-indexPatternDimension-count');
        await page.testSubj.click('lns-indexPattern-dimensionContainerClose');

        await page.testSubj.click('lnsXY_splitDimensionPanel > lns-empty-dimension');
        await page.testSubj.click('lns-indexPatternDimension-terms');
        await page.testSubj.click('indexPattern-dimension-field');
        await page.testSubj.typeWithDelay(
          'indexPattern-dimension-field > comboBoxSearchInput',
          'geo.src'
        );
        await page.locator('.euiComboBoxOption__content:has-text("geo.src")').click();
        await page.testSubj.click('lns-indexPattern-dimensionContainerClose');

        await filterBar.addFilter({ field: 'geo.src', operator: 'is not', value: 'CN' });
        await pageObjects.lens.saveAndReturn();
        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step('create datatable visualization', async () => {
        await pageObjects.dashboard.openAddPanelFlyout();
        await page.testSubj.click('create-action-Lens');
        await page.testSubj.waitForSelector('lnsApp', { state: 'visible' });

        await pageObjects.lens.switchToVisualization('lnsDatatable');
        await page.testSubj.click('lnsDatatable_rows > lns-empty-dimension');
        await page.testSubj.click('lns-indexPatternDimension-terms');
        await page.testSubj.click('indexPattern-dimension-field');
        await page.testSubj.typeWithDelay(
          'indexPattern-dimension-field > comboBoxSearchInput',
          'geo.src'
        );
        await page.locator('.euiComboBoxOption__content:has-text("geo.src")').click();
        await page.testSubj.click('lns-indexPattern-dimensionContainerClose');

        await page.testSubj.click('lnsDatatable_metrics > lns-empty-dimension');
        await page.testSubj.click('lns-indexPatternDimension-count');
        await page.testSubj.click('lns-indexPattern-dimensionContainerClose');

        await pageObjects.lens.saveAndReturn();
        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step('enable sync colors and compare mappings', async () => {
        await pageObjects.dashboard.openSettingsFlyout();
        await pageObjects.dashboard.toggleSyncColors(true);
        await pageObjects.dashboard.applyDashboardSettings();
        await pageObjects.dashboard.waitForRenderComplete();

        const colorMappings1 = Object.entries(getColorMapping(await getChartDebugState(page, 0)));
        const colorMappings2 = Object.entries(getColorMapping(await getChartDebugState(page, 1)));

        const els = await page
          .locator('[data-test-subj="datatableVisualization"] [data-test-subj="cellContents"]')
          .all();
        const colorMappings3 = await Promise.all(
          els.map(async (el) => {
            const backgroundColor = await el.evaluate(
              (node) => getComputedStyle(node).backgroundColor
            );
            return [await el.innerText(), chroma(backgroundColor as string).hex()];
          })
        );

        expect(colorMappings1).toHaveLength(6);
        expect(colorMappings2).toHaveLength(6);
        // eslint-disable-next-line playwright/prefer-to-have-count
        expect(colorMappings3).toHaveLength(6);

        const mergedColorAssignments = new Map<string, Set<string>>();
        [...colorMappings1, ...colorMappings2, ...colorMappings3].forEach(([key, color]) => {
          mergedColorAssignments.set(key, mergedColorAssignments.get(key) ?? new Set());
          mergedColorAssignments.get(key)?.add(color);
        });

        mergedColorAssignments.forEach((colors, key) => {
          expect(
            colors.size,
            `Key "${key}" was assigned multiple colors: ${JSON.stringify([...colors])}`
          ).toBe(1);
        });
      });
    }
  );

  spaceTest('should be possible to disable color sync', async ({ page, pageObjects }) => {
    await spaceTest.step('disable sync colors', async () => {
      await pageObjects.dashboard.openSettingsFlyout();
      await pageObjects.dashboard.toggleSyncColors(false);
      await pageObjects.dashboard.applyDashboardSettings();
      await pageObjects.dashboard.waitForRenderComplete();
    });

    await spaceTest.step('compare color mappings', async () => {
      const colorMapping1 = getColorMapping(await getChartDebugState(page, 0));
      const colorMapping2 = getColorMapping(await getChartDebugState(page, 1));
      const colorsByOrder1 = Object.values(colorMapping1);
      const colorsByOrder2 = Object.values(colorMapping2);
      expect(colorsByOrder1).toStrictEqual(colorsByOrder2);
    });
  });
});
