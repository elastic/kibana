/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Panel toggles for data sources with no time field, in both classic and ES|QL
 * mode. Without a time field Discover renders no histogram at all — it is absent
 * rather than collapsed — so the table is always shown and only the sidebar can
 * be toggled.
 *
 * Migrated from `src/platform/test/functional/apps/discover/group9/_panels_toggle.ts`
 * (`non-time based data view` and `ES|QL without a time field` scenarios).
 *
 * These two scenarios share the `without-timefield` data view, so they live
 * together here and keep that archive out of the other panels-toggle specs.
 */

import { expect } from '@kbn/scout/ui';
import { createChartlessPanelsStateAssertion, spaceTest, testData } from '../fixtures';

spaceTest.describe(
  'Discover panels toggle - no time field',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await discoverScoutSpace.savedObjects.load(testData.WITHOUT_TIMEFIELD_KBN_ARCHIVE);
      // Open Discover on the no-time-field view directly. Switching to it through
      // the data-view picker in `beforeEach` raced the picker's filtered list
      // under load, and API setup is cheaper than driving the UI per test.
      await discoverScoutSpace.uiSettings.setDefaultIndex(testData.NO_TIME_FIELD_DATA_VIEW);
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

    spaceTest('only the sidebar can be toggled in a data view', async ({ page, pageObjects }) => {
      const { discover } = pageObjects;
      const expectPanels = createChartlessPanelsStateAssertion(page);

      await spaceTest.step('initial state — sidebar open, no chart', async () => {
        // Guards against the table rendering empty: every panel assertion below
        // would still pass against a grid with no documents.
        await expect.poll(() => discover.getHitCountInt()).toBeGreaterThan(0);
        await expectPanels({ sidebar: true });
      });

      await spaceTest.step('sidebar toggle', async () => {
        await discover.closeSidebar();
        await expectPanels({ sidebar: false });

        await discover.openSidebar();
        await expectPanels({ sidebar: true });
      });
    });

    spaceTest('only the sidebar can be toggled in ES|QL mode', async ({ page, pageObjects }) => {
      const { discover, dataGrid } = pageObjects;
      const expectPanels = createChartlessPanelsStateAssertion(page);

      // Switch to ES|QL *without* writing a query, so Discover derives one from
      // the selected data view. Writing an explicit `FROM logstash-*` would
      // reintroduce `@timestamp` and with it the histogram, which is exactly
      // what this scenario must not have.
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      await dataGrid.waitForDocTableRendered();

      await spaceTest.step('initial state — sidebar open, no chart', async () => {
        await expect.poll(() => discover.getHitCountInt()).toBeGreaterThan(0);
        await expectPanels({ sidebar: true });
      });

      await spaceTest.step('sidebar toggle', async () => {
        await discover.closeSidebar();
        await expectPanels({ sidebar: false });

        await discover.openSidebar();
        await expectPanels({ sidebar: true });
      });
    });
  }
);
