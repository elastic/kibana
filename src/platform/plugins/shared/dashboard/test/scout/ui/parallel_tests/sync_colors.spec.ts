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
import type { PageObjects } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import {
  LENS_BASIC_DATA_VIEW,
  LENS_BASIC_KIBANA_ARCHIVE,
  LENS_BASIC_TIME_RANGE,
} from '../constants';

const normalizeKey = (value: string) => {
  const trimmed = value.trim();
  const withoutInstruction = trimmed.split(';')[0].split(' Click')[0];
  const withoutSuffix = withoutInstruction.split(' - ')[0];
  const lastSegment = withoutSuffix.split(':').pop() ?? withoutSuffix;
  return lastSegment.replace(/[^A-Za-z0-9 _.-]/g, '').trim();
};

const getColorMapping = (debugState: DebugState | null) => {
  const colorMapping: Record<string, string> = {};
  if (debugState?.legend?.items?.length) {
    debugState.legend.items.forEach(({ name, color }) => {
      colorMapping[normalizeKey(name)] = color;
    });
    return colorMapping;
  }
  debugState?.bars?.forEach(({ name, color }) => {
    colorMapping[normalizeKey(name)] = color;
  });
  return colorMapping;
};

declare global {
  interface Window {
    _echDebugStateFlag?: boolean;
  }
}

const getChartDebugState = async (page: ScoutPage, panelIndex: number) => {
  await expect.poll(() => page.locator('.echChart').count()).toBeGreaterThan(panelIndex);
  const charts = await page.locator('.echChart').all();
  const chart = charts[panelIndex];
  if (!chart) {
    throw new Error(`Chart panel index ${panelIndex} not found`);
  }
  const status = chart.locator('.echChartStatus');
  let debugState: string | null = null;
  await expect
    .poll(async () => {
      debugState = await status.getAttribute('data-ech-debug-state');
      return debugState;
    })
    .not.toBeNull();
  return debugState ? (JSON.parse(debugState) as DebugState) : null;
};

const maybeApplyLensChanges = async (pageObjects: Pick<PageObjects, 'lens'>): Promise<void> => {
  if (await pageObjects.lens.applyChangesButton.isVisible()) {
    await pageObjects.lens.applyChanges();
  }
};

const createBaseXYCharts = async (
  pageObjects: PageObjects,
  filterBar: PageObjects['filterBar']
) => {
  await pageObjects.dashboard.openNewLensPanel();
  await pageObjects.lens.configureXYDimensions({
    y: { operation: 'count' },
    split: {
      operation: 'terms',
      field: 'geo.src',
      palette: { mode: 'legacy', id: 'default' },
    },
  });
  await pageObjects.lens.saveAndReturn();

  await pageObjects.dashboard.openNewLensPanel();
  await pageObjects.lens.configureXYDimensions({
    y: { operation: 'count' },
    split: {
      operation: 'terms',
      field: 'geo.src',
      palette: { mode: 'legacy', id: 'default' },
    },
  });
  await filterBar.addFilter({ field: 'geo.src', operator: 'is not', value: 'CN' });
  await pageObjects.lens.saveAndReturn();
  await pageObjects.dashboard.waitForPanelsToLoad(2);
  await expect.poll(() => pageObjects.dashboard.getVisualizationCount('xyVisChart')).toBe(2);
};

const getDatatableCellsByColumn = async (page: ScoutPage, colIndex: number) =>
  page
    .locator(
      `[data-test-subj="lnsDataTable"] [data-test-subj="dataGridRowCell"][data-gridcell-column-index="${colIndex}"]`
    )
    .all();

spaceTest.describe('Sync colors', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(LENS_BASIC_KIBANA_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(LENS_BASIC_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(LENS_BASIC_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
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
      await spaceTest.step('create xy charts with legacy palette', async () => {
        await createBaseXYCharts(pageObjects, filterBar);
      });

      await spaceTest.step('create datatable visualization', async () => {
        await pageObjects.dashboard.openNewLensPanel();
        await pageObjects.lens.switchToVisualization('lnsDatatable');
        await maybeApplyLensChanges(pageObjects);
        await pageObjects.lens.configureDimension({
          dimension: 'lnsDatatable_rows > lns-empty-dimension',
          operation: 'terms',
          field: 'geo.src',
          keepOpen: true,
        });
        await pageObjects.lens.setTermsNumberOfValues(5);
        await pageObjects.lens.setTableDynamicColoring('cell');
        await pageObjects.lens.setPalette('default', true);
        await pageObjects.lens.closeDimensionEditorPanel();
        await maybeApplyLensChanges(pageObjects);
        await pageObjects.lens.configureDimension({
          dimension: 'lnsDatatable_metrics > lns-empty-dimension',
          operation: 'count',
        });
        await pageObjects.lens.saveAndReturn();
        await expect(page.testSubj.locator('lnsDataTable')).toBeVisible();
      });

      await spaceTest.step('enable sync colors and compare mappings', async () => {
        await pageObjects.dashboard.openSettingsFlyout();
        await pageObjects.dashboard.toggleSyncColors(true);
        await pageObjects.dashboard.applyDashboardSettings();
        await page.testSubj.click('querySubmitButton');

        const getMergedColorAssignments = async () => {
          const colorMappings1 = Object.entries(getColorMapping(await getChartDebugState(page, 0)));
          const colorMappings2 = Object.entries(getColorMapping(await getChartDebugState(page, 1)));

          await expect(page.testSubj.locator('lnsDataTable')).toBeVisible();
          await expect
            .poll(() =>
              page
                .locator('[data-test-subj="lnsDataTable"] [data-test-subj="dataGridRowCell"]')
                .count()
            )
            .toBeGreaterThan(0);

          const els = await getDatatableCellsByColumn(page, 1);
          const colorMappings3 = (
            await Promise.all(
              els.map(async (el) => {
                const label = normalizeKey((await el.innerText()).trim());
                if (!label) {
                  return null;
                }
                const backgroundColor = await el.evaluate(
                  (node) => getComputedStyle(node).backgroundColor
                );
                return [label, chroma(backgroundColor as string).hex()] as [string, string];
              })
            )
          ).filter((entry): entry is [string, string] => Boolean(entry));

          const sharedKeys = new Set<string>([
            ...colorMappings1.map(([key]) => key),
            ...colorMappings2.map(([key]) => key),
          ]);
          const sharedColorMappings3 = colorMappings3.filter(([key]) => sharedKeys.has(key));

          const mergedColorAssignments = new Map<string, Set<string>>();
          [...colorMappings1, ...colorMappings2, ...sharedColorMappings3].forEach(
            ([key, color]) => {
              mergedColorAssignments.set(key, mergedColorAssignments.get(key) ?? new Set());
              mergedColorAssignments.get(key)?.add(color);
            }
          );

          return {
            colorMappings1,
            colorMappings2,
            sharedColorMappings3,
            mergedColorAssignments,
          };
        };

        await expect
          .poll(async () => {
            const { mergedColorAssignments } = await getMergedColorAssignments();
            return [...mergedColorAssignments.values()].every((colors) => colors.size === 1);
          })
          .toBe(true);

        const { colorMappings1, colorMappings2, sharedColorMappings3, mergedColorAssignments } =
          await getMergedColorAssignments();

        expect(colorMappings1).toHaveLength(colorMappings2.length);
        expect(sharedColorMappings3).toHaveLength(colorMappings1.length);

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
    await spaceTest.step('create xy charts with legacy palette', async () => {
      await createBaseXYCharts(pageObjects, pageObjects.filterBar);
    });

    await spaceTest.step('disable sync colors', async () => {
      await pageObjects.dashboard.openSettingsFlyout();
      await pageObjects.dashboard.toggleSyncColors(false);
      await pageObjects.dashboard.applyDashboardSettings();
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
