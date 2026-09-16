/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sidebar / histogram / table collapse-expand panel toggles on a time-based
 * data view. The no-time-field counterpart lives in
 * `panels_toggle_no_time_field.spec.ts`.
 *
 * Migrated from `src/platform/test/functional/apps/discover/group9/_panels_toggle.ts`
 * (`time based data view` scenario).
 *
 * The FTR scenario had 4 separate `it` blocks that shared browser state between
 * them. Scout gives every test a fresh context, so they are collapsed into a
 * single `spaceTest` using `spaceTest.step()`.
 */

import { expect } from '@kbn/scout/ui';
import { createPanelsStateAssertion, expectSidebarState, spaceTest } from '../fixtures';

spaceTest.describe(
  'Discover panels toggle - data view mode',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.dataGrid.waitForLoad();
      await pageObjects.dataGrid.waitForDocTableRendered();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('panels can be toggled in a time-based data view', async ({ page, pageObjects }) => {
      const { discover } = pageObjects;
      const expectPanels = createPanelsStateAssertion(page);

      await spaceTest.step('initial state — all panels open', async () => {
        await expect.poll(() => discover.getHitCount()).toBe('14,004');
        await expectPanels({ sidebar: true, chart: true, table: true });
      });

      await spaceTest.step('sidebar toggle', async () => {
        await discover.closeSidebar();
        await expectSidebarState(page, false);

        await discover.openSidebar();
        await expectSidebarState(page, true);
      });

      await spaceTest.step('histogram toggle', async () => {
        await discover.hideChart();
        await expectPanels({ sidebar: true, chart: false, table: true });

        await discover.showChart();
        await expectPanels({ sidebar: true, chart: true, table: true });
      });

      await spaceTest.step('table toggle', async () => {
        await discover.hideTable();
        await expectPanels({ sidebar: true, chart: true, table: false });

        await discover.showTable();
        await expectPanels({ sidebar: true, chart: true, table: true });
      });

      await spaceTest.step('sidebar and histogram toggle', async () => {
        await discover.closeSidebar();
        await discover.hideChart();
        await expectPanels({ sidebar: false, chart: false, table: true });

        await discover.openSidebar();
        await discover.showChart();
        await expectPanels({ sidebar: true, chart: true, table: true });
      });
    });
  }
);
