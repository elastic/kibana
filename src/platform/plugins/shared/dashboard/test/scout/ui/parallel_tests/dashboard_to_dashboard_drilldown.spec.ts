/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, ScoutPage } from '@kbn/scout';
import type { DebugState } from '@elastic/charts';
import {
  enableElasticChartDebug,
  findImportedSavedObjectId,
  getChartDebugState,
  spaceTest,
  tags,
} from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE =
  'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard_drilldowns/drilldowns';

let pieDashboardId = '';
let areaDashboardId = '';
let logstashDataViewId = '';
const PIE_DASHBOARD_TITLE = 'Dashboard with Pie Chart';
const AREA_DASHBOARD_TITLE = 'Dashboard With Area Chart';
const PIE_PANEL_TITLE = 'Visualization PieChart';

const DRILLDOWN_TO_PIE_CHART_NAME = 'Go to pie chart dashboard';
const DRILLDOWN_TO_AREA_CHART_NAME = 'Go to area chart dashboard';

const controlsInput = (panels: Record<string, unknown>) => ({
  chainingSystem: 'HIERARCHICAL',
  controlStyle: 'oneLine',
  ignoreParentSettingsJSON:
    '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
  panelsJSON: JSON.stringify(panels),
  showApplySelections: false,
});

const getDashboardIdFromUrl = (url: string) => /#\/view\/([^?/]+)/.exec(url)?.[1];

spaceTest.describe('Dashboard to dashboard drilldown', { tag: tags.stateful.classic }, () => {
  let copyToSpaceId = '';

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(KBN_ARCHIVE);
    pieDashboardId = findImportedSavedObjectId(imported, 'dashboard', PIE_DASHBOARD_TITLE);
    areaDashboardId = findImportedSavedObjectId(imported, 'dashboard', AREA_DASHBOARD_TITLE);
    logstashDataViewId = findImportedSavedObjectId(imported, 'index-pattern', 'logstash-*');
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
    copyToSpaceId = `${scoutSpace.id}_copy`;
  });

  spaceTest.beforeEach(async ({ browserAuth, page }) => {
    // Expose the elastic-charts debug state so the pie slices can be located
    await enableElasticChartDebug(page);
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
    await kbnClient.spaces.delete(copyToSpaceId).catch(() => {});
  });

  const clickPieSlice = async (page: ScoutPage, sliceName: string) => {
    const pie = page.testSubj.locator('partitionVisChart');
    await expect(async () => {
      const debugState = await getChartDebugState<DebugState>(pie);
      const slice = (debugState.partition?.[0]?.partitions ?? []).find(
        (s) => String(s.name) === sliceName
      );
      expect(slice).toBeDefined();
      await pie.click({ position: { x: slice!.coords[0], y: slice!.coords[1] } });
      await expect(page.testSubj.locator('multipleActionsContextMenu')).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 30_000 });
  };

  const getActionItem = (page: ScoutPage, text: string) =>
    page.testSubj
      .locator('multipleActionsContextMenu')
      .locator('[data-test-subj*="embeddablePanelAction-"]')
      .filter({ hasText: text });

  const drillDownFromPieSlice = async (
    page: ScoutPage,
    pageObjects: { dashboard: { waitForRenderComplete: () => Promise<void> } },
    actionName: string
  ) => {
    await clickPieSlice(page, '40000');
    const oldId = getDashboardIdFromUrl(page.url());
    await getActionItem(page, actionName).click();
    await expect.poll(() => getDashboardIdFromUrl(page.url())).not.toBe(oldId);
    await pageObjects.dashboard.waitForRenderComplete();
  };

  spaceTest('creates a dashboard to dashboard drilldown', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.openDashboardWithIdInEditMode(pieDashboardId);
    await dashboard.clickPanelAction(
      'embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN',
      PIE_PANEL_TITLE
    );
    await expect(page.testSubj.locator('createDrilldownFlyout')).toBeVisible();
    await page.testSubj.click('drilldownFactoryItem-dashboard_drilldown');
    await page.testSubj.locator('drilldownNameInput').fill(DRILLDOWN_TO_AREA_CHART_NAME);
    await page.components
      .comboBox('dashboardDrilldownSelectDashboard')
      .setSelectedOptions([AREA_DASHBOARD_TITLE]);
    await page.testSubj.click('drilldownWizardSubmit');
    await expect(page.testSubj.locator('createDrilldownFlyout')).toBeHidden();

    await dashboard.openPanelContextMenu(PIE_PANEL_TITLE);
    await expect(
      page.testSubj
        .locator('embeddablePanelAction-OPEN_FLYOUT_EDIT_DRILLDOWN')
        .filter({ visible: true })
        .locator('.euiNotificationBadge')
    ).toHaveText('1');
    await page.keyboard.press('Escape');

    await dashboard.saveChangesToExistingDashboard();
  });

  spaceTest('drills to destination dashboard via onClick action', async ({ page, pageObjects }) => {
    await pageObjects.dashboard.openDashboardWithId(pieDashboardId);
    await drillDownFromPieSlice(page, pageObjects, DRILLDOWN_TO_AREA_CHART_NAME);

    expect(getDashboardIdFromUrl(page.url())).toBe(areaDashboardId);
    await expect(pageObjects.dashboard.getAppTitle()).toContainText(AREA_DASHBOARD_TITLE);
    await expect(
      page.testSubj.locator('~filter & ~filter-key-memory & ~filter-value-40,000 to 80,000')
    ).toBeVisible();
  });

  spaceTest('drills to destination dashboard via getHref action', async ({ page, pageObjects }) => {
    await pageObjects.dashboard.openDashboardWithId(pieDashboardId);
    await clickPieSlice(page, '40000');

    const href = await getActionItem(page, DRILLDOWN_TO_AREA_CHART_NAME).getAttribute('href');
    expect(typeof href).toBe('string');
    const hrefDashboardId = pageObjects.dashboard.getDashboardIdFromUrl(href!);
    expect(hrefDashboardId).toBe(areaDashboardId);

    await page.goto(href!);
    await pageObjects.dashboard.waitForRenderComplete();
    expect(getDashboardIdFromUrl(page.url())).toBe(areaDashboardId);
    await expect(
      page.testSubj.locator('~filter & ~filter-key-memory & ~filter-value-40,000 to 80,000')
    ).toBeVisible();
  });

  spaceTest('carries over all filters from source dashboard', async ({ page, pageObjects }) => {
    await pageObjects.dashboard.openDashboardWithId(pieDashboardId);
    await pageObjects.filterBar.addFilter({ field: 'machine.os', operator: 'is', value: 'ios' });

    await drillDownFromPieSlice(page, pageObjects, DRILLDOWN_TO_AREA_CHART_NAME);

    expect(getDashboardIdFromUrl(page.url())).toBe(areaDashboardId);
    await expect(
      page.testSubj.locator('~filter & ~filter-key-machine.os & ~filter-value-ios')
    ).toBeVisible();
  });

  spaceTest('carries over time range from source dashboard', async ({ page, pageObjects }) => {
    await pageObjects.dashboard.openDashboardWithId(pieDashboardId);
    await pageObjects.datePicker.setAbsoluteRange({
      from: 'Sep 22, 2015 @ 06:31:44.000',
      to: 'Sep 23, 2015 @ 06:31:44.000',
    });
    await pageObjects.dashboard.waitForRenderComplete();

    await drillDownFromPieSlice(page, pageObjects, DRILLDOWN_TO_AREA_CHART_NAME);

    expect(getDashboardIdFromUrl(page.url())).toBe(areaDashboardId);
    const { start, end } = await pageObjects.datePicker.getTimeConfig();
    const hours = (new Date(end).getTime() - new Date(start).getTime()) / (60 * 60 * 1000);
    expect(hours).toBe(24);
  });

  spaceTest(
    'browser back navigation works after drilldown navigation',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(pieDashboardId);
      await drillDownFromPieSlice(page, pageObjects, DRILLDOWN_TO_AREA_CHART_NAME);
      expect(getDashboardIdFromUrl(page.url())).toBe(areaDashboardId);

      await page.goBack();
      await expect.poll(() => getDashboardIdFromUrl(page.url())).toBe(pieDashboardId);
      await pageObjects.dashboard.waitForRenderComplete();
      await expect(pageObjects.dashboard.getAppTitle()).toContainText(PIE_DASHBOARD_TITLE);
    }
  );

  spaceTest('deletes dashboard to dashboard drilldown', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.openDashboardWithIdInEditMode(pieDashboardId);
    await dashboard.clickPanelAction(
      'embeddablePanelAction-OPEN_FLYOUT_EDIT_DRILLDOWN',
      PIE_PANEL_TITLE
    );
    await expect(page.testSubj.locator('editDrilldownFlyout')).toBeVisible();

    await page.testSubj
      .locator('listManageDrilldownsItem')
      .filter({ hasText: DRILLDOWN_TO_AREA_CHART_NAME })
      .locator('input')
      .click();
    await page.testSubj.click('listManageDeleteDrilldowns');
    await page.testSubj.click('euiFlyoutCloseButton');
    await expect(page.testSubj.locator('editDrilldownFlyout')).toBeHidden();

    await dashboard.openPanelContextMenu(PIE_PANEL_TITLE);
    await expect(
      page.testSubj
        .locator('embeddablePanelAction-OPEN_FLYOUT_EDIT_DRILLDOWN')
        .filter({ visible: true })
        .locator('.euiNotificationBadge')
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    // Drilldown is only deleted in the unsaved state, discard it for the following tests
    await dashboard.clickCancelOutOfEditMode({ discardChanges: true });
  });

  const seedControls = async (kbnClient: KbnClient, spaceId: string) => {
    await kbnClient.savedObjects.update({
      space: spaceId,
      type: 'dashboard',
      id: pieDashboardId,
      attributes: {
        controlGroupInput: controlsInput({
          optionsList1: {
            type: 'optionsListControl',
            order: 0,
            grow: true,
            width: 'medium',
            explicitInput: {
              id: 'optionsList1',
              dataViewId: logstashDataViewId,
              fieldName: 'geo.src',
              selectedOptions: ['CN', 'US'],
            },
          },
          rangeSlider1: {
            type: 'rangeSliderControl',
            order: 1,
            grow: true,
            width: 'medium',
            explicitInput: {
              id: 'rangeSlider1',
              dataViewId: logstashDataViewId,
              fieldName: 'bytes',
              value: ['1000', '15000'],
            },
          },
        }),
      },
      references: undefined,
    });
    await kbnClient.savedObjects.update({
      space: spaceId,
      type: 'dashboard',
      id: areaDashboardId,
      attributes: {
        controlGroupInput: controlsInput({
          optionsList2: {
            type: 'optionsListControl',
            order: 0,
            grow: true,
            width: 'medium',
            explicitInput: {
              id: 'optionsList2',
              dataViewId: logstashDataViewId,
              fieldName: 'geo.src',
            },
          },
        }),
      },
      references: undefined,
    });
  };

  spaceTest(
    'creates filter pills representing controls selections',
    async ({ page, kbnClient, scoutSpace, pageObjects }) => {
      await seedControls(kbnClient, scoutSpace.id);
      const { dashboard, controls, filterBar } = pageObjects;
      await dashboard.openDashboardWithId(pieDashboardId);
      await drillDownFromPieSlice(page, pageObjects, DRILLDOWN_TO_AREA_CHART_NAME);

      expect(getDashboardIdFromUrl(page.url())).toBe(areaDashboardId);
      await expect(
        page.testSubj.locator('~filter & ~filter-key-memory & ~filter-value-40,000 to 80,000')
      ).toBeVisible();
      await expect(
        page.testSubj.locator('~filter & ~filter-key-geo.src & ~filter-value-CN, US')
      ).toBeVisible();
      await expect
        .poll(() => filterBar.hasFilter({ field: 'bytes', value: '1,000 to 15,000' }))
        .toBe(true);

      // control filter pills impact destination dashboard controls
      const controlId = await controls.getOnlyControlId();
      await controls.optionsList.openPopover(controlId);
      expect(await controls.optionsList.getAvailableOptionsCount()).toBe(2);
      await controls.optionsList.ensurePopoverIsClosed();
    }
  );

  spaceTest(
    'copies dashboards linked by a drilldown to a space',
    async ({ page, kbnClient, scoutSpace, pageObjects }) => {
      await kbnClient.spaces.create({
        id: copyToSpaceId,
        name: copyToSpaceId,
        disabledFeatures: [],
      });

      const response = await kbnClient.request<
        Record<string, { success: boolean; successCount: number }>
      >({
        method: 'POST',
        path: `/s/${scoutSpace.id}/api/spaces/_copy_saved_objects`,
        body: {
          objects: [{ type: 'dashboard', id: areaDashboardId }],
          spaces: [copyToSpaceId],
          includeReferences: true,
          overwrite: true,
          createNewCopies: false,
        },
      });
      const result = response.data[copyToSpaceId];
      expect(result.success).toBe(true);
      // 2 dashboards (linked by a drilldown) + 2 visualizations + 1 index pattern
      expect(result.successCount).toBe(5);

      await page.gotoApp('dashboards', {
        pathOptions: { basePath: `/s/${copyToSpaceId}` },
        hash: `/view/${areaDashboardId}`,
      } as never);
      await pageObjects.dashboard.waitForRenderComplete();

      // brush area chart and drilldown back to pie chart dashboard
      const areaChart = page.testSubj.locator('visualizationLoader');
      await expect(areaChart).toBeVisible();
      const box = await areaChart.boundingBox();
      if (!box) {
        throw new Error('Expected the area chart to have a bounding box');
      }
      const y = box.y + box.height / 2;
      const centerX = box.x + box.width / 2;
      await page.mouse.move(centerX - 100, y);
      await page.mouse.down();
      await page.mouse.move(centerX, y, { steps: 5 });
      await page.mouse.move(centerX + 100, y, { steps: 5 });
      await page.mouse.up();

      await expect(page.testSubj.locator('multipleActionsContextMenu')).toBeVisible();
      await getActionItem(page, DRILLDOWN_TO_PIE_CHART_NAME).click();
      await expect.poll(() => getDashboardIdFromUrl(page.url())).toBe(pieDashboardId);
      await pageObjects.dashboard.waitForRenderComplete();
      await expect(page.testSubj.locator('partitionVisChart')).toBeVisible();
    }
  );
});
