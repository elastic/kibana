/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sidebar / histogram / table collapse-expand panel toggles for ES|QL mode.
 *
 * Migrated from `src/platform/test/functional/apps/discover/group9/_panels_toggle.ts`
 * (`ES|QL with histogram chart` and `ES|QL with aggs chart` scenarios). The
 * no-time-field counterpart lives in `panels_toggle_no_time_field.spec.ts`.
 *
 * Each FTR scenario had up to 4 separate `it` blocks that shared browser state.
 * Scout gives every test a fresh context, so they collapse into a single
 * `spaceTest` each using `spaceTest.step()`.
 *
 * The `ES|QL with aggs chart` scenario uses a `STATS … BY …` query, which
 * renders the cascade layout while `discover.cascadeLayoutEnabled` is on (the
 * Scout default). The FTR disabled that flag for the whole suite via its config;
 * we can't do the equivalent at runtime because the override is Kibana-wide and
 * the `cascade_layout_*` specs run concurrently in this same parallel config and
 * need the flag on. So the test opts out through the UI instead.
 */

import { expect } from '@kbn/scout/ui';
import { createPanelsStateAssertion, expectSidebarState, spaceTest } from '../fixtures';

spaceTest.describe(
  'Discover panels toggle - ES|QL mode',
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

    spaceTest(
      'panels can be toggled in ES|QL mode with a histogram chart',
      async ({ page, pageObjects }) => {
        const { discover, dataGrid } = pageObjects;
        const expectPanels = createPanelsStateAssertion(page);

        await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 1000');
        await discover.waitUntilTabIsLoaded();
        await dataGrid.waitForDocTableRendered();

        await spaceTest.step('initial state — all panels open', async () => {
          await expect.poll(() => discover.getHitCount()).toBe('1,000');
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
      }
    );

    spaceTest(
      'panels can be toggled in ES|QL mode with an aggs chart',
      async ({ page, pageObjects }) => {
        const { discover, dataGrid } = pageObjects;
        const expectPanels = createPanelsStateAssertion(page);

        await discover.writeAndSubmitEsqlQuery(
          'from logstash-* | stats avg(bytes) by extension | limit 100'
        );
        await discover.waitUntilTabIsLoaded();

        // Restores the flat histogram + table layout; see the file header for why
        // this goes through the UI rather than a feature-flag override.
        await discover.optOutOfCascadeLayout();

        await dataGrid.waitForDocTableRendered();

        await spaceTest.step('initial state — all panels open', async () => {
          await expect.poll(() => discover.getHitCount()).toBe('5');
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
      }
    );
  }
);
