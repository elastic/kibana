/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  dragControlResizeHandle,
  getControlPanel,
  getControlPanelBox,
  getSavedPinnedControls,
} from '../../utils/control_resize_helpers';

const DATA_VIEW_ID = 'controls-resize-logstash';

// These are the pixel widths the controls renderer uses for the small, medium and large options
const SMALL_WIDTH = 224;
const MEDIUM_WIDTH = 400;
const LARGE_WIDTH = 800;

// Four medium controls need ~1.6k px, so at this width they always wrap onto several rows,
// whether the side navigation is docked or collapsed
const VIEWPORT = { width: 1180, height: 900 };

const CONTROL_TITLES = {
  first: 'Resize first',
  growing: 'Resize growing',
  third: 'Resize third',
  fourth: 'Resize fourth',
};

const buildControl = (title: string, grow: boolean) => ({
  type: 'options_list_control' as const,
  width: 'medium' as const,
  grow,
  config: { title, data_view_id: DATA_VIEW_ID, field_name: 'geo.src' },
});

let dashboardId = '';

// Focus: resizing controls through the real resize handle with the browser's own flex layout,
// including a growing control and controls that wrap onto later rows
spaceTest.describe('Dashboard controls resize', { tag: tags.stateful.classic }, () => {
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
        title: 'Controls resize',
        pinned_panels: [
          buildControl(CONTROL_TITLES.first, false),
          buildControl(CONTROL_TITLES.growing, true),
          buildControl(CONTROL_TITLES.third, false),
          buildControl(CONTROL_TITLES.fourth, false),
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

  spaceTest(
    'resizing a growing control on the first row saves the snapped width and keeps grow',
    async ({ kbnClient, page, pageObjects, scoutSpace }) => {
      const { controls, dashboard } = pageObjects;
      const first = getControlPanel(page, CONTROL_TITLES.first);
      const growing = getControlPanel(page, CONTROL_TITLES.growing);
      const fourth = getControlPanel(page, CONTROL_TITLES.fourth);

      await spaceTest.step('open the dashboard in edit mode', async () => {
        await dashboard.openDashboardWithIdInEditMode(dashboardId);
        await expect(controls.frames).toHaveCount(4);
      });

      await spaceTest.step('the browser wraps the controls and grows the growing one', async () => {
        const firstBox = await getControlPanelBox(first);
        const fourthBox = await getControlPanelBox(fourth);
        expect(fourthBox.y).toBeGreaterThan(firstBox.y);

        // a growing control fills the space its row leaves over, so it is wider than its option
        const growingBox = await getControlPanelBox(growing);
        expect(growingBox.y).toBe(firstBox.y);
        expect(growingBox.width).toBeGreaterThan(MEDIUM_WIDTH + 20);
      });

      await spaceTest.step('drag the handle of the growing control down to small', async () => {
        const { width } = await getControlPanelBox(growing);
        await dragControlResizeHandle(page, growing, SMALL_WIDTH - width);

        // A growing control keeps filling its row after the drag, so its rendered width is the
        // snapped width plus the leftover space. It must just have shrunk from where it started;
        // the snapped width itself is verified on the saved dashboard below.
        await expect
          .poll(async () => (await getControlPanelBox(growing)).width)
          .toBeLessThan(width - 20);
      });

      await spaceTest.step('save and verify the persisted controls', async () => {
        await dashboard.saveChangesToExistingDashboard();

        await expect
          .poll(async () => {
            const saved = await getSavedPinnedControls(kbnClient, scoutSpace.id, dashboardId);
            return saved.map(({ config, width, grow }) => ({
              title: config.title,
              width,
              grow: Boolean(grow),
            }));
          })
          .toStrictEqual([
            { title: CONTROL_TITLES.first, width: 'medium', grow: false },
            { title: CONTROL_TITLES.growing, width: 'small', grow: true },
            { title: CONTROL_TITLES.third, width: 'medium', grow: false },
            { title: CONTROL_TITLES.fourth, width: 'medium', grow: false },
          ]);
      });
    }
  );

  spaceTest(
    'resizing a control on a wrapped row saves the snapped width',
    async ({ kbnClient, page, pageObjects, scoutSpace }) => {
      const { controls, dashboard } = pageObjects;
      const first = getControlPanel(page, CONTROL_TITLES.first);
      const third = getControlPanel(page, CONTROL_TITLES.third);

      await spaceTest.step('open the dashboard in edit mode', async () => {
        await dashboard.openDashboardWithIdInEditMode(dashboardId);
        await expect(controls.frames).toHaveCount(4);
      });

      await spaceTest.step('the third control starts on a wrapped row', async () => {
        const firstBox = await getControlPanelBox(first);
        const thirdBox = await getControlPanelBox(third);
        expect(thirdBox.y).toBeGreaterThan(firstBox.y);
        expect(Math.round(thirdBox.width)).toBe(MEDIUM_WIDTH);
      });

      await spaceTest.step('drag the handle of the wrapped control out to large', async () => {
        const { width } = await getControlPanelBox(third);
        await dragControlResizeHandle(page, third, LARGE_WIDTH - width);

        await expect
          .poll(async () => Math.round((await getControlPanelBox(third)).width))
          .toBeGreaterThanOrEqual(LARGE_WIDTH - 1);
      });

      await spaceTest.step('save and verify the persisted controls', async () => {
        await dashboard.saveChangesToExistingDashboard();

        await expect
          .poll(async () => {
            const saved = await getSavedPinnedControls(kbnClient, scoutSpace.id, dashboardId);
            return saved.map(({ config, width, grow }) => ({
              title: config.title,
              width,
              grow: Boolean(grow),
            }));
          })
          .toStrictEqual([
            { title: CONTROL_TITLES.first, width: 'medium', grow: false },
            { title: CONTROL_TITLES.growing, width: 'medium', grow: true },
            { title: CONTROL_TITLES.third, width: 'large', grow: false },
            { title: CONTROL_TITLES.fourth, width: 'medium', grow: false },
          ]);
      });
    }
  );
});
