/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '../fixtures';

const STATS_QUERY =
  'from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB';

spaceTest.describe(
  'Discover ES|QL filtering from a dashboard panel',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'filters on a group-by cell but offers no filter on an aggregated one',
      async ({ pageObjects, scoutSpace }) => {
        const { dashboard, dataGrid, discover, filterBar } = pageObjects;
        const savedSearchTitle = `esql filter from table ${scoutSpace.id}`;

        await discover.writeAndSubmitEsqlQuery(STATS_QUERY);
        // `STATS ... BY` lands in the cascade layout; save the flat table so the
        // panel renders individual cells to act on.
        await discover.optOutOfCascadeLayout();
        await dataGrid.waitForDocTableRendered();
        await discover.saveSearch(savedSearchTitle);

        await dashboard.openNewDashboard();
        await dashboard.addPanelFromLibrary(savedSearchTitle);
        await dashboard.waitForRenderComplete();

        // The group-by column is filterable, and doing so adds a dashboard filter.
        await dataGrid.clickCellFilterFor(0, 'geo.dest');
        await expect.poll(() => filterBar.getFilterCount()).toBe(1);

        // The aggregated column is not: no filter action is offered on its cells.
        const aggregatedCell = dataGrid.getCell(0, 'countB');
        await aggregatedCell.hover();
        await expect(aggregatedCell.locator('[data-test-subj="filterForButton"]')).toBeHidden();
      }
    );
  }
);
