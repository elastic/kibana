/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const FIRST_TAB_LABEL = 'Untitled';
const SECOND_TAB_LABEL = 'testing';
const THIRD_TAB_LABEL = 'third tab';
const SAVED_SEARCH_TITLE = 'A Saved Search';

const getFilterBadge = (page: ScoutPage, field: string, value: string) =>
  page.locator(`[data-test-subj*="filter-key-${field}"][data-test-subj*="filter-value-${value}"]`);

const goBackToDiscover = async (page: ScoutPage) => {
  await page.testSubj.click('~breadcrumb-deepLinkId-discover');
  await page.testSubj.locator('dscPage').waitFor({ state: 'visible' });
};

spaceTest.describe('Discover tabs - navigation', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'returns to the last active tab from Surrounding Docs',
    async ({ page, pageObjects }) => {
      const { dataGrid, discover, filterBar, unifiedTabs } = pageObjects;

      await discover.loadSavedSearch(SAVED_SEARCH_TITLE);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCountInt()).toBe(14_004);
      expect(await discover.getCurrentQueryName()).toBe(SAVED_SEARCH_TITLE);

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
      await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'jpg' });
      await page.keyboard.press('Escape');
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getHitCountInt()).toBe(9_109);
      expect(await unifiedTabs.getTabLabels()).toStrictEqual([FIRST_TAB_LABEL, SECOND_TAB_LABEL]);

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(2, THIRD_TAB_LABEL);
      await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'png' });
      await page.keyboard.press('Escape');
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getHitCountInt()).toBe(1_373);
      expect(await unifiedTabs.getTabLabels()).toStrictEqual([
        FIRST_TAB_LABEL,
        SECOND_TAB_LABEL,
        THIRD_TAB_LABEL,
      ]);

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      await dataGrid.openSurroundingDocuments(0);
      await page.waitForURL(/#\/context/);
      await getFilterBadge(page, 'extension', 'jpg').waitFor({ state: 'visible' });

      await goBackToDiscover(page);
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getHitCountInt()).toBe(9_109);
      expect(await unifiedTabs.getTabLabels()).toStrictEqual([
        FIRST_TAB_LABEL,
        SECOND_TAB_LABEL,
        THIRD_TAB_LABEL,
      ]);
      await expect(getFilterBadge(page, 'extension', 'jpg')).toHaveCount(1);
      expect(await unifiedTabs.getSelectedTabLabel()).toBe(SECOND_TAB_LABEL);
      expect(await discover.getCurrentQueryName()).toBe(SAVED_SEARCH_TITLE);
    }
  );

  spaceTest('returns to the last active tab from Single Doc', async ({ page, pageObjects }) => {
    const { dataGrid, discover, filterBar, unifiedTabs } = pageObjects;

    await unifiedTabs.createNewTab();
    await discover.waitUntilTabIsLoaded();
    await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
    await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'jpg' });
    await discover.waitUntilTabIsLoaded();

    expect(await discover.getHitCountInt()).toBe(9_109);
    expect(await unifiedTabs.getTabLabels()).toStrictEqual([FIRST_TAB_LABEL, SECOND_TAB_LABEL]);

    await dataGrid.openSingleDocument(0);
    await page.waitForURL(/#\/doc/);
    await page.testSubj.locator('doc-hit').waitFor({ state: 'visible' });

    await goBackToDiscover(page);
    await discover.waitUntilTabIsLoaded();

    expect(await discover.getHitCountInt()).toBe(9_109);
    expect(await unifiedTabs.getTabLabels()).toStrictEqual([FIRST_TAB_LABEL, SECOND_TAB_LABEL]);
    await expect(getFilterBadge(page, 'extension', 'jpg')).toHaveCount(1);
    expect(await unifiedTabs.getSelectedTabLabel()).toBe(SECOND_TAB_LABEL);
    await expect(page.testSubj.locator('breadcrumb first last')).toHaveCount(1);
  });

  spaceTest(
    'restores the latest tabs when returning via app navigation',
    async ({ page, pageObjects }) => {
      const { collapsibleNav, discover, queryBar, unifiedTabs } = pageObjects;
      const queryKql = 'response:200';
      const queryEsql = 'FROM logstash-* | LIMIT 11';

      await unifiedTabs.editTabLabel(0, 'kql');
      await discover.writeAndSubmitKqlQuery(queryKql);
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getHitCountInt()).toBe(12_891);
      expect(await unifiedTabs.getTabLabels()).toStrictEqual(['kql']);

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await discover.writeAndSubmitEsqlQuery(queryEsql);
      await unifiedTabs.editTabLabel(1, 'esql');
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getHitCountInt()).toBe(11);
      expect(await unifiedTabs.getTabLabels()).toStrictEqual(['kql', 'esql']);

      // goto() opens app from a fresh app URL, which bypasses the chrome navigation which we want to test here
      await collapsibleNav.clickItem('Dashboards');
      await page.testSubj.locator('dashboardLandingPage').waitFor({ state: 'visible' });

      // goto() opens app from a fresh app URL, which bypasses the chrome navigation which we want to test here
      await collapsibleNav.clickItem('Discover');
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getHitCountInt()).toBe(11);
      expect(await unifiedTabs.getTabLabels()).toStrictEqual(['kql', 'esql']);
      expect(await unifiedTabs.getSelectedTabLabel()).toBe('esql');
      expect(await discover.getEsqlQueryValue()).toBe(queryEsql);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getHitCountInt()).toBe(12_891);
      expect(await unifiedTabs.getSelectedTabLabel()).toBe('kql');
      expect(await queryBar.getQuery()).toBe(queryKql);
    }
  );
});
