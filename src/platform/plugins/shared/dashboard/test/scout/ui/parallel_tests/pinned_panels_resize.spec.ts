/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CONTROL_WIDTH_LARGE,
  CONTROL_WIDTH_MEDIUM,
  CONTROL_WIDTH_PIXELS,
  CONTROL_WIDTH_SMALL,
} from '@kbn/controls-constants';
import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  dragPinnedPanelResizeHandle,
  getPinnedPanel,
  getPinnedPanelBox,
  getSavedPinnedPanels,
} from '../../utils/pinned_panel_resize_helpers';

const DATA_VIEW_ID = 'pinned-panels-resize-logstash';

const {
  [CONTROL_WIDTH_SMALL]: SMALL_WIDTH,
  [CONTROL_WIDTH_MEDIUM]: MEDIUM_WIDTH,
  [CONTROL_WIDTH_LARGE]: LARGE_WIDTH,
} = CONTROL_WIDTH_PIXELS;

// Four medium pinned panels need ~1.6k px, so at this width they always wrap onto several rows,
// whether the side navigation is docked or collapsed
const VIEWPORT = { width: 1180, height: 900 };

const PINNED_PANEL_TITLES = {
  first: 'Resize first',
  growing: 'Resize growing',
  third: 'Resize third',
  fourth: 'Resize fourth',
};

const buildPinnedPanel = (title: string, grow: boolean) => ({
  type: 'options_list_control' as const,
  width: 'medium' as const,
  grow,
  config: { title, data_view_id: DATA_VIEW_ID, field_name: 'geo.src' },
});

let dashboardId = '';

// Focus: resizing pinned panels through the real resize handle with the browser's own flex layout,
// including a growing pinned panel and pinned panels that wrap onto later rows
spaceTest.describe('Dashboard pinned panels resize', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();

    await apiServices.dataViews.create({
      id: DATA_VIEW_ID,
      title: 'logstash-*',
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
  });

  spaceTest.beforeEach(async ({ apiServices, browserAuth, page, scoutSpace }) => {
    // each test saves the dashboard, so every test starts from a fresh one
    dashboardId = await apiServices.dashboard.create(
      {
        title: 'Pinned panels resize',
        pinned_panels: [
          buildPinnedPanel(PINNED_PANEL_TITLES.first, false),
          buildPinnedPanel(PINNED_PANEL_TITLES.growing, true),
          buildPinnedPanel(PINNED_PANEL_TITLES.third, false),
          buildPinnedPanel(PINNED_PANEL_TITLES.fourth, false),
        ],
        panels: [],
      },
      scoutSpace.id
    );
    await page.setViewportSize(VIEWPORT);
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  // TODO: re-enable once the pinned panel resize handle is visible again. The handle is currently hidden,
  // so waiting for the visible "Resize panel" button times out.
  spaceTest.skip(
    'resizing a growing pinned panel on the first row saves the snapped width and keeps grow',
    async ({ kbnClient, page, pageObjects, scoutSpace }) => {
      const { controls, dashboard } = pageObjects;
      const first = getPinnedPanel(page, PINNED_PANEL_TITLES.first);
      const growing = getPinnedPanel(page, PINNED_PANEL_TITLES.growing);
      const fourth = getPinnedPanel(page, PINNED_PANEL_TITLES.fourth);

      await spaceTest.step('open the dashboard in edit mode', async () => {
        await dashboard.openDashboardWithIdInEditMode(dashboardId);
        await expect(controls.frames).toHaveCount(4);
      });

      await spaceTest.step(
        'the browser wraps the pinned panels and grows the growing one',
        async () => {
          const firstBox = await getPinnedPanelBox(first);
          const fourthBox = await getPinnedPanelBox(fourth);
          expect(fourthBox.y).toBeGreaterThan(firstBox.y);

          // a growing pinned panel fills the space its row leaves over, so it is wider than its option
          const growingBox = await getPinnedPanelBox(growing);
          expect(growingBox.y).toBe(firstBox.y);
          expect(growingBox.width).toBeGreaterThan(MEDIUM_WIDTH + 20);
        }
      );

      await spaceTest.step(
        'drag the handle of the growing pinned panel down to small',
        async () => {
          const { width } = await getPinnedPanelBox(growing);
          await dragPinnedPanelResizeHandle(page, growing, SMALL_WIDTH - width);

          // A growing pinned panel keeps filling its row after the drag, so its rendered width is the
          // snapped width plus the leftover space. It must just have shrunk from where it started;
          // the snapped width itself is verified on the saved dashboard below.
          await expect
            .poll(async () => (await getPinnedPanelBox(growing)).width)
            .toBeLessThan(width - 20);
        }
      );

      await spaceTest.step('save and verify the persisted pinned panels', async () => {
        await dashboard.saveChangesToExistingDashboard();

        await expect
          .poll(async () => {
            const saved = await getSavedPinnedPanels(kbnClient, scoutSpace.id, dashboardId);
            return saved.map(({ config, width, grow }) => ({
              title: config.title,
              width,
              grow: Boolean(grow),
            }));
          })
          .toStrictEqual([
            { title: PINNED_PANEL_TITLES.first, width: 'medium', grow: false },
            { title: PINNED_PANEL_TITLES.growing, width: 'small', grow: true },
            { title: PINNED_PANEL_TITLES.third, width: 'medium', grow: false },
            { title: PINNED_PANEL_TITLES.fourth, width: 'medium', grow: false },
          ]);
      });
    }
  );

  // TODO: re-enable once the pinned panel resize handle is visible again. The handle is currently hidden,
  // so waiting for the visible "Resize panel" button times out.
  spaceTest.skip(
    'resizing a pinned panel on a wrapped row saves the snapped width',
    async ({ kbnClient, page, pageObjects, scoutSpace }) => {
      const { controls, dashboard } = pageObjects;
      const first = getPinnedPanel(page, PINNED_PANEL_TITLES.first);
      const third = getPinnedPanel(page, PINNED_PANEL_TITLES.third);

      await spaceTest.step('open the dashboard in edit mode', async () => {
        await dashboard.openDashboardWithIdInEditMode(dashboardId);
        await expect(controls.frames).toHaveCount(4);
      });

      await spaceTest.step('the third pinned panel starts on a wrapped row', async () => {
        const firstBox = await getPinnedPanelBox(first);
        const thirdBox = await getPinnedPanelBox(third);
        expect(thirdBox.y).toBeGreaterThan(firstBox.y);
        expect(Math.round(thirdBox.width)).toBe(MEDIUM_WIDTH);
      });

      await spaceTest.step('drag the handle of the wrapped pinned panel out to large', async () => {
        const { width } = await getPinnedPanelBox(third);
        await dragPinnedPanelResizeHandle(page, third, LARGE_WIDTH - width);

        await expect
          .poll(async () => Math.round((await getPinnedPanelBox(third)).width))
          .toBeGreaterThanOrEqual(LARGE_WIDTH - 1);
      });

      await spaceTest.step('save and verify the persisted pinned panels', async () => {
        await dashboard.saveChangesToExistingDashboard();

        await expect
          .poll(async () => {
            const saved = await getSavedPinnedPanels(kbnClient, scoutSpace.id, dashboardId);
            return saved.map(({ config, width, grow }) => ({
              title: config.title,
              width,
              grow: Boolean(grow),
            }));
          })
          .toStrictEqual([
            { title: PINNED_PANEL_TITLES.first, width: 'medium', grow: false },
            { title: PINNED_PANEL_TITLES.growing, width: 'medium', grow: true },
            { title: PINNED_PANEL_TITLES.third, width: 'large', grow: false },
            { title: PINNED_PANEL_TITLES.fourth, width: 'medium', grow: false },
          ]);
      });
    }
  );
});
