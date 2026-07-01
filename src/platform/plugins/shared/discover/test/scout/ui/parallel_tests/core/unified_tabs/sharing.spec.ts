/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const testSubj = (id: string) => `[data-test-subj="${id}"]`;
const testSubjStartsWith = (prefix: string) => `[data-test-subj^="${prefix}"]`;

const createName = (prefix: string, scoutSpaceId: string) =>
  `${prefix}_${scoutSpaceId.replace(/-/g, '_')}`;

const waitUntilDiscoverLoaded = async (page: ScoutPage) => {
  await page.locator(testSubj('dscPage')).waitFor({ state: 'visible' });

  try {
    await page.locator(testSubj('discoverDataGridUpdating')).waitFor({
      state: 'visible',
      timeout: 2_000,
    });
  } catch {
    // Loading indicator does not appear when the page is already settled.
  }

  await page.locator(testSubj('discoverDataGridUpdating')).waitFor({
    state: 'hidden',
    timeout: 30_000,
  });
};

const openSharedPage = async (page: ScoutPage, sharedUrl: string) => {
  const sharedPage = (await page.context().newPage()) as ScoutPage;
  await sharedPage.goto(sharedUrl);
  await waitUntilDiscoverLoaded(sharedPage);
  return sharedPage;
};

const getTabs = (page: ScoutPage) =>
  page
    .locator(testSubj('unifiedTabs_tabsBar'))
    .locator(testSubjStartsWith('unifiedTabs_selectTabBtn_'));

const getTabLabels = async (page: ScoutPage) =>
  getTabs(page).evaluateAll((tabs) => tabs.map((tab) => (tab as HTMLElement).innerText.trim()));

const getSelectedTabLabel = async (page: ScoutPage) =>
  (await getTabs(page).and(page.locator('[aria-selected="true"]')).innerText()).trim();

const editTabLabel = async (page: ScoutPage, index: number, newLabel: string) => {
  const tabs = await getTabs(page).all();
  const tab = tabs[index];
  await tab.dblclick();

  const input = page.locator(testSubjStartsWith('unifiedTabs_editTabLabelInput_'));
  await input.waitFor({ state: 'visible' });
  await input.fill(newLabel);
  await input.press('Enter');
  await tab.getByText(newLabel, { exact: true }).waitFor({ state: 'visible' });
};

const getHitCount = async (page: ScoutPage) =>
  page.locator(testSubj('discoverQueryHits')).innerText();

const getQuery = async (page: ScoutPage) => page.locator(testSubj('queryInput')).inputValue();

const writeAndSubmitKqlQuery = async (page: ScoutPage, query: string) => {
  await page.locator(testSubj('queryInput')).fill(query);
  await page.locator(testSubj('querySubmitButton')).click();
  await waitUntilDiscoverLoaded(page);
};

const writeAndSubmitEsqlQuery = async (page: ScoutPage, query: string) => {
  const codeEditor = new KibanaCodeEditorWrapper(page);
  await codeEditor.setCodeEditorValue(query);
  await page.locator(testSubj('querySubmitButton')).click();
  await waitUntilDiscoverLoaded(page);
};

const getEsqlQuery = async (page: ScoutPage) => {
  const codeEditor = new KibanaCodeEditorWrapper(page);
  return codeEditor.getCodeEditorValue();
};

const getSavedSearchTitle = async (page: ScoutPage) =>
  (await page.locator(testSubj('breadcrumb last')).innerText()).trim();

const hasFilter = async (page: ScoutPage, field: string, value: string) =>
  page
    .locator(`[data-test-subj*="filter-key-${field}"][data-test-subj*="filter-value-${value}"]`)
    .isVisible();

const isCurrentDataViewAdHoc = async (page: ScoutPage) => {
  const dataViewSwitches = [
    page.locator(testSubj('discover-dataView-switch-link')),
    page.locator(testSubj('dataView-switch-link')),
  ];
  const visibleDataViewSwitches = [];

  for (const dataViewSwitch of dataViewSwitches) {
    if (await dataViewSwitch.isVisible()) {
      visibleDataViewSwitches.push(dataViewSwitch);
    }
  }

  if (visibleDataViewSwitches.length !== 1) {
    throw new Error(`Expected one visible data view switch, got ${visibleDataViewSwitches.length}`);
  }

  const [dataViewSwitch] = visibleDataViewSwitches;
  const dataViewTitle = await dataViewSwitch.getAttribute('title');

  if (!dataViewTitle) {
    throw new Error('Current data view switch is missing a title attribute');
  }

  await dataViewSwitch.click();
  const isAdHoc = await page
    .locator(testSubj(`dataViewItemTempBadge-${dataViewTitle}`))
    .isVisible();
  await page.keyboard.press('Escape');
  await page.locator(testSubj('indexPattern-switcher')).waitFor({ state: 'hidden' });

  return isAdHoc;
};

const openTabsBarMenu = async (page: ScoutPage) => {
  await page.locator(testSubj('unifiedTabs_tabsBarMenuButton')).click();
  await page.locator(testSubj('unifiedTabs_tabsBarMenuPanel')).waitFor({ state: 'visible' });
};

const closeTabsBarMenu = async (page: ScoutPage) => {
  await page.keyboard.press('Escape');
  await page.locator(testSubj('unifiedTabs_tabsBarMenuPanel')).waitFor({ state: 'hidden' });
};

const getRecentlyClosedItemTitles = async (items: ReturnType<ScoutPage['locator']>) => {
  const texts = await items.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLElement).innerText.trim())
  );

  return texts.map((text) => text.split('\n')[0]);
};

const getRecentlyClosedTabLabels = async (page: ScoutPage) => {
  await openTabsBarMenu(page);
  const labels = await getRecentlyClosedItemTitles(
    page.locator(testSubjStartsWith('unifiedTabs_tabsMenu_recentlyClosedTab_'))
  );
  await closeTabsBarMenu(page);

  return labels;
};

const getRecentlyClosedRootTitles = async (page: ScoutPage) => {
  await openTabsBarMenu(page);
  const titles = await getRecentlyClosedItemTitles(
    page.locator(
      `${testSubjStartsWith('unifiedTabs_tabsMenu_recentlyClosedGroup_')}, ${testSubjStartsWith(
        'unifiedTabs_tabsMenu_recentlyClosedTab_'
      )}`
    )
  );
  await closeTabsBarMenu(page);

  return titles;
};

const getRecentlyClosedGroupTabTitles = async (page: ScoutPage, groupIndex: number) => {
  await openTabsBarMenu(page);
  const groups = await page
    .locator(testSubjStartsWith('unifiedTabs_tabsMenu_recentlyClosedGroup_'))
    .all();
  await groups[groupIndex].click();
  await page.locator(testSubj('unifiedTabs_tabsMenu_restoreAllTabs')).waitFor({ state: 'visible' });

  const titles = await getRecentlyClosedItemTitles(
    page.locator(testSubjStartsWith('unifiedTabs_tabsMenu_recentlyClosedGroupTab_'))
  );
  await closeTabsBarMenu(page);

  return titles;
};

spaceTest.describe('Discover tabs - sharing', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await pageObjects.unifiedTabs.clearRecentlyClosedTabs();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('can share an unsaved tab', async ({ page, pageObjects }) => {
    const { discover, queryBar, unifiedTabs } = pageObjects;

    await unifiedTabs.editTabLabel(0, 'first tab');
    await discover.waitUntilTabIsLoaded();
    expect(await discover.getHitCountInt()).toBe(14_004);

    await unifiedTabs.createNewTab();
    await discover.waitUntilTabIsLoaded();
    await unifiedTabs.editTabLabel(1, 'second tab');
    await discover.writeAndSubmitKqlQuery('bytes > 1000');
    expect(await discover.getHitCountInt()).toBe(12_653);
    expect(await unifiedTabs.getTabLabels()).toStrictEqual(['first tab', 'second tab']);

    const sharedUrl = await discover.getSharedUrl();
    const sharedPage = await openSharedPage(page, sharedUrl);

    expect(await getHitCount(sharedPage)).toBe('12,653');
    expect(await getQuery(sharedPage)).toBe('bytes > 1000');
    expect(await getTabLabels(sharedPage)).toStrictEqual(['first tab', 'second tab']);
    expect(await getRecentlyClosedTabLabels(sharedPage)).toStrictEqual([]);
    expect(await getSelectedTabLabel(sharedPage)).toBe('second tab');

    await editTabLabel(sharedPage, 1, 'second tab (modified)');
    await writeAndSubmitKqlQuery(sharedPage, 'bytes > 500');
    expect(await getHitCount(sharedPage)).toBe('13,129');

    await sharedPage.close();
    await page.bringToFront();
    await page.reload();
    await discover.waitUntilTabIsLoaded();

    expect(await discover.getHitCountInt()).toBe(12_653);
    expect(await queryBar.getQuery()).toBe('bytes > 1000');
    expect(await unifiedTabs.getTabLabels()).toStrictEqual(['first tab', 'second tab (modified)']);
    expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);
    expect(await unifiedTabs.getSelectedTabLabel()).toBe('second tab (modified)');

    await page.evaluate(() => window.localStorage.setItem('discover.tabs', ''));
    const emptyStorageSharedPage = await openSharedPage(page, sharedUrl);

    expect(await getHitCount(emptyStorageSharedPage)).toBe('12,653');
    expect(await getQuery(emptyStorageSharedPage)).toBe('bytes > 1000');
    expect(await getTabLabels(emptyStorageSharedPage)).toStrictEqual(['second tab']);
    expect(await getRecentlyClosedTabLabels(emptyStorageSharedPage)).toStrictEqual([]);

    await emptyStorageSharedPage.close();
  });

  spaceTest(
    'can share one persisted tab from a persisted session',
    async ({ page, pageObjects, scoutSpace }) => {
      const { discover, unifiedTabs } = pageObjects;
      const savedSearchName = createName('esql', scoutSpace.id);
      const queryEsql = 'FROM logstash-* | LIMIT 20';
      const queryEsqlModified = 'FROM logstash-* | LIMIT 22';

      await unifiedTabs.editTabLabel(0, 'esql1');
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, 'esql2');
      await discover.writeAndSubmitEsqlQuery(queryEsql);
      expect(await discover.getHitCountInt()).toBe(20);
      expect(await unifiedTabs.getTabLabels()).toStrictEqual(['esql1', 'esql2']);

      await discover.saveSearch(savedSearchName);
      await discover.waitUntilTabIsLoaded();

      const sharedUrl = await discover.getSharedUrl();
      const sharedPage = await openSharedPage(page, sharedUrl);

      expect(await getHitCount(sharedPage)).toBe('20');
      expect(await getEsqlQuery(sharedPage)).toBe(queryEsql);
      expect(await getSelectedTabLabel(sharedPage)).toBe('esql2');
      expect(await getTabLabels(sharedPage)).toStrictEqual(['esql1', 'esql2']);
      expect(await getRecentlyClosedTabLabels(sharedPage)).toStrictEqual([]);
      expect(await getSavedSearchTitle(sharedPage)).toBe(savedSearchName);

      await editTabLabel(sharedPage, 1, 'esql2 (modified)');
      await writeAndSubmitEsqlQuery(sharedPage, queryEsqlModified);
      expect(await getHitCount(sharedPage)).toBe('22');

      await sharedPage.close();
      await page.bringToFront();
      await page.reload();
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getHitCountInt()).toBe(20);
      expect(await discover.getEsqlQueryValue()).toBe(queryEsql);
      expect(await unifiedTabs.getSelectedTabLabel()).toBe('esql2 (modified)');
      expect(await unifiedTabs.getTabLabels()).toStrictEqual(['esql1', 'esql2 (modified)']);
      expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);
      expect(await discover.getCurrentQueryName()).toBe(savedSearchName);

      await page.evaluate(() => window.localStorage.setItem('discover.tabs', ''));
      const emptyStorageSharedPage = await openSharedPage(page, sharedUrl);

      expect(await getHitCount(emptyStorageSharedPage)).toBe('20');
      expect(await getEsqlQuery(emptyStorageSharedPage)).toBe(queryEsql);
      expect(await getSelectedTabLabel(emptyStorageSharedPage)).toBe('esql2');
      expect(await getTabLabels(emptyStorageSharedPage)).toStrictEqual(['esql1', 'esql2']);
      expect(await getRecentlyClosedTabLabels(emptyStorageSharedPage)).toStrictEqual([]);
      expect(await getSavedSearchTitle(emptyStorageSharedPage)).toBe(savedSearchName);

      await emptyStorageSharedPage.close();
    }
  );

  spaceTest(
    'can share one unsaved tab from a persisted session',
    async ({ page, pageObjects, scoutSpace }) => {
      const { discover, filterBar, queryBar, unifiedTabs } = pageObjects;
      const savedSearchName = createName('kql', scoutSpace.id);

      await unifiedTabs.editTabLabel(0, 'saved');
      await discover.saveSearch(savedSearchName);
      await discover.waitUntilTabIsLoaded();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await discover.createDataViewFromSearchBar({ name: 'logs', adHoc: true });
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, 'unsaved');
      await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'jpg' });
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCountInt()).toBe(9_109);
      expect(await unifiedTabs.getTabLabels()).toStrictEqual(['saved', 'unsaved']);

      const sharedUrl = await discover.getSharedUrl();
      await discover.closeShareModal();

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await discover.clickNewSearch();
      await discover.waitUntilTabIsLoaded();

      const sharedPage = await openSharedPage(page, sharedUrl);

      expect(await getHitCount(sharedPage)).toBe('9,109');
      expect(await hasFilter(sharedPage, 'extension', 'jpg')).toBe(true);
      expect(await getSelectedTabLabel(sharedPage)).toBe('unsaved');
      expect(await getTabLabels(sharedPage)).toStrictEqual(['saved', 'unsaved']);
      expect(await getRecentlyClosedRootTitles(sharedPage)).toStrictEqual(['Untitled', '2 tabs']);
      expect(await getRecentlyClosedGroupTabTitles(sharedPage, 0)).toStrictEqual([
        'saved',
        'unsaved',
      ]);
      expect(await getSavedSearchTitle(sharedPage)).toBe(savedSearchName);
      expect(await isCurrentDataViewAdHoc(sharedPage)).toBe(true);

      await editTabLabel(sharedPage, 1, 'unsaved (modified)');
      await writeAndSubmitKqlQuery(sharedPage, 'bytes > 1000');
      expect(await getHitCount(sharedPage)).toBe('8,830');

      await sharedPage.close();
      await page.bringToFront();
      await discover.loadSavedSearch(savedSearchName);
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getHitCountInt()).toBe(14_004);
      expect(await filterBar.getFilterCount()).toBe(0);
      expect(await queryBar.getQuery()).toBe('');
      expect(await unifiedTabs.getSelectedTabLabel()).toBe('saved');
      expect(await unifiedTabs.getTabLabels()).toStrictEqual(['saved']);
      const recentlyClosedRootTitles = await unifiedTabs.getRecentlyClosedRootTitles();
      expect([...recentlyClosedRootTitles].sort()).toStrictEqual(
        ['unsaved (modified)', 'Untitled', '2 tabs'].sort()
      );
      expect(await unifiedTabs.getRecentlyClosedGroupTabTitles(0)).toStrictEqual([
        'saved',
        'unsaved',
      ]);
      expect(await discover.getCurrentQueryName()).toBe(savedSearchName);
      expect(await discover.isCurrentDataViewAdHoc()).toBe(false);
    }
  );
});
