/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient } from '@kbn/scout';
import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  dragPinnedPanelNextTo,
  getBox,
  getPinnedPanel,
  getSavedPinnedPanels,
} from '../../utils/pinned_panel_reorder_helpers';

// Four medium pinned panels need ~1.6k px, so at this width they always wrap onto several rows,
// whether the side navigation is docked or collapsed
const VIEWPORT = { width: 1180, height: 900 };

const PINNED_PANEL_TITLES = {
  first: 'Reorder first',
  growing: 'Reorder growing',
  third: 'Reorder third',
  fourth: 'Reorder fourth',
};

const buildPinnedPanel = (title: string, grow: boolean, dataViewId: string) => ({
  type: 'options_list_control' as const,
  width: 'medium' as const,
  grow,
  config: { title, data_view_id: dataViewId, field_name: 'geo.src' },
});

const getSavedTitles = async (
  kbnClient: KbnClient,
  spaceId: string,
  dashboardId: string
): Promise<Array<string | undefined>> => {
  const saved = await getSavedPinnedPanels(kbnClient, spaceId, dashboardId);
  return saved.map(({ config }) => config.title);
};

let dashboardId = '';
// data view IDs must be unique across spaces, so use the generated ID instead of a fixed one
let dataViewId = '';

// Focus: reordering pinned panels with the real move handle and the browser's own flex layout,
// across rows that wrap, and persisting the new order when the dashboard is saved
spaceTest.describe('Dashboard pinned panels reorder', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();

    const { data: dataView } = await apiServices.dataViews.create({
      title: 'logstash-*',
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    dataViewId = dataView.id;
  });

  spaceTest.beforeEach(async ({ apiServices, browserAuth, page, scoutSpace }) => {
    // each test saves the dashboard, so every test starts from a fresh one
    dashboardId = await apiServices.dashboard.create(
      {
        title: 'Pinned panels reorder',
        pinned_panels: [
          buildPinnedPanel(PINNED_PANEL_TITLES.first, false, dataViewId),
          buildPinnedPanel(PINNED_PANEL_TITLES.growing, true, dataViewId),
          buildPinnedPanel(PINNED_PANEL_TITLES.third, false, dataViewId),
          buildPinnedPanel(PINNED_PANEL_TITLES.fourth, false, dataViewId),
        ],
        panels: [],
      },
      scoutSpace.id
    );
    await page.setViewportSize(VIEWPORT);
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
    // cleaning the saved objects deletes the data view but not the default index setting. Only
    // unset it when it points to this suite's data view: creating a data view leaves an existing
    // default alone, and writing the setting fails when it is locked via uiSettings.overrides
    let ownsDefaultIndex = false;

    try {
      // read before cleaning; a failed lookup rejects here but must not skip the cleanup below
      const currentDefaultIndex = await kbnClient.uiSettings.get('defaultIndex', {
        space: scoutSpace.id,
      });
      ownsDefaultIndex = Boolean(dataViewId) && currentDefaultIndex === dataViewId;
    } finally {
      await scoutSpace.savedObjects.cleanStandardList();
    }

    if (ownsDefaultIndex) {
      await scoutSpace.uiSettings.unset('defaultIndex');
    }
  });

  spaceTest(
    'moving a pinned panel from a wrapped row to the start of the first row saves the new order',
    async ({ kbnClient, page, pageObjects, scoutSpace }) => {
      const { controls, dashboard } = pageObjects;
      const first = getPinnedPanel(page, PINNED_PANEL_TITLES.first);
      const fourth = getPinnedPanel(page, PINNED_PANEL_TITLES.fourth);

      await spaceTest.step('open the dashboard in edit mode', async () => {
        await dashboard.openDashboardWithIdInEditMode(dashboardId);
        await expect(controls.frames).toHaveCount(4);
      });

      await spaceTest.step('the fourth pinned panel starts on a wrapped row', async () => {
        const firstBox = await getBox(first);
        const fourthBox = await getBox(fourth);
        expect(fourthBox.y).toBeGreaterThan(firstBox.y);
      });

      await spaceTest.step('drag the fourth pinned panel before the first one', async () => {
        await dragPinnedPanelNextTo(page, fourth, first, 'before');

        // the moved pinned panel now leads the first row
        await expect
          .poll(async () => {
            const firstBox = await getBox(first);
            const fourthBox = await getBox(fourth);
            return fourthBox.y === firstBox.y && fourthBox.x < firstBox.x;
          })
          .toBe(true);
      });

      await spaceTest.step('save and verify the persisted order', async () => {
        await dashboard.saveChangesToExistingDashboard();

        await expect
          .poll(() => getSavedTitles(kbnClient, scoutSpace.id, dashboardId))
          .toStrictEqual([
            PINNED_PANEL_TITLES.fourth,
            PINNED_PANEL_TITLES.first,
            PINNED_PANEL_TITLES.growing,
            PINNED_PANEL_TITLES.third,
          ]);
      });
    }
  );

  spaceTest(
    'moving a pinned panel from the first row into a wrapped row saves the new order',
    async ({ kbnClient, page, pageObjects, scoutSpace }) => {
      const { controls, dashboard } = pageObjects;
      const first = getPinnedPanel(page, PINNED_PANEL_TITLES.first);
      const third = getPinnedPanel(page, PINNED_PANEL_TITLES.third);
      const fourth = getPinnedPanel(page, PINNED_PANEL_TITLES.fourth);

      await spaceTest.step('open the dashboard in edit mode', async () => {
        await dashboard.openDashboardWithIdInEditMode(dashboardId);
        await expect(controls.frames).toHaveCount(4);
      });

      await spaceTest.step('the third pinned panel starts on a wrapped row', async () => {
        const firstBox = await getBox(first);
        const thirdBox = await getBox(third);
        expect(thirdBox.y).toBeGreaterThan(firstBox.y);
      });

      await spaceTest.step('drag the first pinned panel after the third one', async () => {
        await dragPinnedPanelNextTo(page, first, third, 'after');

        // the third pinned panel moves up to the first row, and the moved one now leads the wrapped
        // row, ahead of the fourth
        await expect
          .poll(async () => {
            const firstBox = await getBox(first);
            const thirdBox = await getBox(third);
            const fourthBox = await getBox(fourth);
            return (
              firstBox.y > thirdBox.y && firstBox.y === fourthBox.y && firstBox.x < fourthBox.x
            );
          })
          .toBe(true);
      });

      await spaceTest.step('save and verify the persisted order', async () => {
        await dashboard.saveChangesToExistingDashboard();

        await expect
          .poll(() => getSavedTitles(kbnClient, scoutSpace.id, dashboardId))
          .toStrictEqual([
            PINNED_PANEL_TITLES.growing,
            PINNED_PANEL_TITLES.third,
            PINNED_PANEL_TITLES.first,
            PINNED_PANEL_TITLES.fourth,
          ]);
      });
    }
  );
});
