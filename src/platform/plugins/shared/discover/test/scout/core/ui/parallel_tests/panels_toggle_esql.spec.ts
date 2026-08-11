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
 * (`ES|QL with histogram chart`, `ES|QL with aggs chart`, and
 * `ES|QL without a time field` scenarios).
 *
 * Each FTR scenario had up to 4 separate `it` blocks that shared browser state.
 * Scout gives every test a fresh context, so they collapse into a single
 * `spaceTest` each using `spaceTest.step()`.
 *
 * The `ES|QL with aggs chart` scenario uses a `STATS … BY …` query that can
 * trigger the cascade layout when `discover.cascadeLayoutEnabled` is on (the
 * Scout default). The test opts out via the UI switch if the cascade layout
 * appears, keeping the standard histogram + table layout under test.
 */

import { expect } from '@kbn/scout/ui';
import {
  createChartlessPanelsStateAssertion,
  createPanelsStateAssertion,
  spaceTest,
  testData,
} from '../fixtures';

spaceTest.describe(
  'Discover panels toggle - ES|QL mode',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.use({ viewport: { width: 1600, height: 1200 } });

    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await discoverScoutSpace.savedObjects.load(testData.WITHOUT_TIMEFIELD_KBN_ARCHIVE);
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
        const expectPanels = createPanelsStateAssertion({ page, discover });

        await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 1000');
        await discover.waitUntilTabIsLoaded();
        await dataGrid.waitForDocTableRendered();

        await spaceTest.step('initial state — all panels open', async () => {
          await expect.poll(() => discover.getHitCount()).toBe('1,000');
          await expectPanels({ sidebar: true, chart: true, table: true });
        });

        await spaceTest.step('sidebar toggle', async () => {
          await discover.closeSidebar();
          await expectPanels({ sidebar: false, chart: true, table: true });

          await discover.openSidebar();
          await expectPanels({ sidebar: true, chart: true, table: true });
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
        const expectPanels = createPanelsStateAssertion({ page, discover });

        await discover.writeAndSubmitEsqlQuery(
          'from logstash-* | stats avg(bytes) by extension | limit 100'
        );
        await discover.waitUntilTabIsLoaded();

        // The cascade layout activates for STATS…BY queries when the feature flag
        // is on (the Scout default). Opt out to keep the standard histogram +
        // table layout under test, consistent with the FTR config that disabled
        // the flag for the whole group9 suite.
        await discover.optOutOfCascadeLayout();

        await dataGrid.waitForDocTableRendered();

        await spaceTest.step('initial state — all panels open', async () => {
          await expect.poll(() => discover.getHitCount()).toBe('5');
          await expectPanels({ sidebar: true, chart: true, table: true });
        });

        await spaceTest.step('sidebar toggle', async () => {
          await discover.closeSidebar();
          await expectPanels({ sidebar: false, chart: true, table: true });

          await discover.openSidebar();
          await expectPanels({ sidebar: true, chart: true, table: true });
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
      'sidebar can be toggled in ES|QL mode without a time field',
      async ({ page, pageObjects }) => {
        const { discover, dataGrid } = pageObjects;
        const expectPanels = createChartlessPanelsStateAssertion({ page, discover });

        await discover.selectDataView(testData.NO_TIME_FIELD_DATA_VIEW);
        await discover.waitUntilTabIsLoaded();
        await dataGrid.waitForDocTableRendered();

        // Switch to ES|QL *without* writing a query, so Discover derives one from
        // the selected data view. Writing an explicit `FROM logstash-*` would
        // reintroduce `@timestamp` and with it the histogram, which is exactly
        // what this scenario must not have.
        await discover.selectTextBaseLang();
        await discover.waitUntilTabIsLoaded();
        await dataGrid.waitForDocTableRendered();

        await spaceTest.step('initial state — sidebar open, no chart', async () => {
          await expectPanels({ sidebar: true });
        });

        await spaceTest.step('sidebar toggle', async () => {
          await discover.closeSidebar();
          await expectPanels({ sidebar: false });

          await discover.openSidebar();
          await expectPanels({ sidebar: true });
        });
      }
    );
  }
);
