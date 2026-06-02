/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover with ES data present but no custom data view, in a search-solution
 * space: the empty-state prompt shows and the tabs bar is hidden until a data
 * view is created or ES|QL mode is entered.
 */

import type { PageObjects } from '@kbn/scout';
import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const CREATED_DATA_VIEW = 'logstash';
// The editor appends `*` to the title, so the created data view is `logstash*`.
const CREATED_DATA_VIEW_TITLE = `${CREATED_DATA_VIEW}*`;
const DEFAULT_ESQL_QUERY = 'FROM logs*';

// Once a data view is active (created or via ES|QL), the doc grid should render
// rows and the tabs bar should appear.
const expectDocsRenderedWithTabsBar = async (discover: PageObjects['discover']) => {
  await discover.waitForDocTableRendered();
  expect(await discover.getDocTableRowCount()).toBeGreaterThan(0);
  await expect(discover.getTabsBar()).toBeVisible();
};

spaceTest.describe(
  'Discover - no custom data view (search solution)',
  { tag: testData.DISCOVER_STATEFUL_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      // `es` is the search/Elasticsearch solution view (FTR's "search" solution).
      await scoutSpace.setSolutionView('es');
    });

    spaceTest.beforeEach(async ({ page, browserAuth, scoutSpace, pageObjects }) => {
      // Reset the "ES data but no custom data view" precondition before each test;
      // the create-data-view test otherwise leaves a data view behind.
      await scoutSpace.savedObjects.cleanStandardList();
      // Cover the 2015 logstash data so ES|QL / created-data-view queries return rows.
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
      await browserAuth.loginAsPrivilegedUser();

      // Set query mode to classic so the empty-state assertions stay valid even when the
      // default Discover query mode is ES|QL (which opens the editor directly
      // instead of the "no data views" prompt). We can't use `discover.goto()`
      // here because it waits for the main Discover shell, which isn't rendered
      // without a data view, so set the mode and navigate manually.
      await pageObjects.discover.setQueryMode('classic');
      await page.gotoApp('discover');
      await expect(pageObjects.discover.getNoDataViewsPrompt()).toBeVisible();
      await expect(pageObjects.discover.getTabsBar()).toBeHidden();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      // Reset the worker's space so a reused worker isn't left in search mode.
      await scoutSpace.setSolutionView('classic');
    });

    spaceTest('can create a data view from the empty-state prompt', async ({ pageObjects }) => {
      const { discover } = pageObjects;

      await discover.createDataViewFromPrompt({ name: CREATED_DATA_VIEW });

      await expect.poll(() => discover.getSelectedDataViewName()).toBe(CREATED_DATA_VIEW_TITLE);
      await expectDocsRenderedWithTabsBar(discover);
    });

    spaceTest('can enter ES|QL mode from the empty state', async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await page.testSubj.click('tryESQLLink');
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getEsqlQueryValue()).toBe(DEFAULT_ESQL_QUERY);
      await expectDocsRenderedWithTabsBar(discover);
    });
  }
);
