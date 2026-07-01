/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with,
 * at your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelTestFixtures } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../fixtures/common';

type PageObjects = ScoutParallelTestFixtures['pageObjects'];

const UNTITLED_TAB_LABEL = 'Untitled';
const FIRST_TAB_LABEL = 'My first tab';
const SECOND_TAB_LABEL = 'My second tab';
const KQL_QUERY = 'machine.os: "ios"';
const FIRST_ESQL_QUERY = 'from logstash-* | limit 51';
const SECOND_ESQL_QUERY = 'from logstash-* | limit 52';

spaceTest.describe(
  'Discover tabs - recently closed tabs',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
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

    const createClosedKqlTab = async (pageObjects: PageObjects) => {
      const { discover, filterBar, unifiedTabs } = pageObjects;

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
      await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'jpg' });
      await discover.waitUntilTabIsLoaded();
      await discover.writeAndSubmitKqlQuery(KQL_QUERY);
      await unifiedTabs.closeTab(1);
      await discover.waitUntilTabIsLoaded();
    };

    const createTwoEsqlTabsAndLoadSavedSearch = async (pageObjects: PageObjects) => {
      const { discover, unifiedTabs } = pageObjects;

      await unifiedTabs.editTabLabel(0, FIRST_TAB_LABEL);
      await discover.writeAndSubmitEsqlQuery(FIRST_ESQL_QUERY);

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
      await discover.writeAndSubmitEsqlQuery(SECOND_ESQL_QUERY);

      await discover.loadSavedSearch(testData.SAVED_SEARCH_TITLE);
      await discover.waitUntilTabIsLoaded();
    };

    spaceTest('starts with no recently closed tabs', async ({ pageObjects }) => {
      expect(await pageObjects.unifiedTabs.getRecentlyClosedRootTitles()).toStrictEqual([]);
    });

    spaceTest('restores a tab after it was closed manually', async ({ pageObjects }) => {
      const { discover, filterBar, queryBar, unifiedTabs } = pageObjects;

      await createClosedKqlTab(pageObjects);

      expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
      expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([SECOND_TAB_LABEL]);

      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.getTabLabels()).toStrictEqual([
        UNTITLED_TAB_LABEL,
        SECOND_TAB_LABEL,
      ]);
      expect(await filterBar.hasFilter({ field: 'extension', value: 'jpg' })).toBe(true);
      expect(await queryBar.getQuery()).toBe(KQL_QUERY);
      expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([SECOND_TAB_LABEL]);
    });

    spaceTest('shows relative time when a tab was closed', async ({ pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.closeTab(1);
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
      const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTexts();
      expect(recentlyClosedTabs).toHaveLength(1);
      expect(recentlyClosedTabs[0]).toMatch(
        new RegExp(`^${SECOND_TAB_LABEL}\\n\\d+ (second|minute)s? ago$`)
      );
    });

    spaceTest('restores a tab after a page refresh', async ({ page, pageObjects }) => {
      const { discover, filterBar, queryBar, unifiedTabs } = pageObjects;

      await createClosedKqlTab(pageObjects);

      expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
      expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([SECOND_TAB_LABEL]);

      await page.reload();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCountInt()).toBe(14_004);

      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.getTabLabels()).toStrictEqual([
        UNTITLED_TAB_LABEL,
        SECOND_TAB_LABEL,
      ]);
      expect(await filterBar.hasFilter({ field: 'extension', value: 'jpg' })).toBe(true);
      expect(await queryBar.getQuery()).toBe(KQL_QUERY);
      expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([SECOND_TAB_LABEL]);
      expect(await discover.getHitCountInt()).toBe(1_813);

      await filterBar.removeFilter('extension');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCountInt()).toBe(2_784);

      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.getTabLabels()).toStrictEqual([
        UNTITLED_TAB_LABEL,
        SECOND_TAB_LABEL,
        SECOND_TAB_LABEL,
      ]);
      expect(await filterBar.hasFilter({ field: 'extension', value: 'jpg' })).toBe(true);
      expect(await queryBar.getQuery()).toBe(KQL_QUERY);
      expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([SECOND_TAB_LABEL]);
      expect(await discover.getHitCountInt()).toBe(1_813);
    });

    spaceTest(
      'updates recently closed tabs after a discover session is opened',
      async ({ pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;

        await createTwoEsqlTabsAndLoadSavedSearch(pageObjects);

        expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);
        expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
        expect(await discover.getHitCountInt()).toBe(14_004);
        expect(await unifiedTabs.getRecentlyClosedRootTitles()).toStrictEqual(['2 tabs']);
        expect(await unifiedTabs.getRecentlyClosedGroupTabTitles(0)).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
        ]);

        await unifiedTabs.restoreRecentlyClosedTabFromGroup(0, 0);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([
          UNTITLED_TAB_LABEL,
          FIRST_TAB_LABEL,
        ]);
        expect(await discover.getEsqlQueryValue()).toBe(FIRST_ESQL_QUERY);
        expect(await discover.getHitCountInt()).toBe(51);

        await unifiedTabs.restoreRecentlyClosedTabFromGroup(0, 1);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([
          UNTITLED_TAB_LABEL,
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
        ]);
        expect(await discover.getEsqlQueryValue()).toBe(SECOND_ESQL_QUERY);
        expect(await discover.getHitCountInt()).toBe(52);
      }
    );

    spaceTest('restores all tabs from a recently closed tab group', async ({ pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;

      await createTwoEsqlTabsAndLoadSavedSearch(pageObjects);

      expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
      expect(await unifiedTabs.getRecentlyClosedRootTitles()).toStrictEqual(['2 tabs']);
      expect(await unifiedTabs.getRecentlyClosedGroupTabTitles(0)).toStrictEqual([
        FIRST_TAB_LABEL,
        SECOND_TAB_LABEL,
      ]);

      await unifiedTabs.restoreAllRecentlyClosedTabsFromGroup(0);
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.getTabLabels()).toStrictEqual([
        UNTITLED_TAB_LABEL,
        FIRST_TAB_LABEL,
        SECOND_TAB_LABEL,
      ]);
      expect(await discover.getEsqlQueryValue()).toBe(FIRST_ESQL_QUERY);
      expect(await discover.getHitCountInt()).toBe(51);

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getEsqlQueryValue()).toBe(SECOND_ESQL_QUERY);
      expect(await discover.getHitCountInt()).toBe(52);
    });

    spaceTest(
      'handles recently closed tabs correctly after saving a new discover session',
      async ({ pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const testTabLabel = 'My test tab';
        const firstSessionName = 'My Discover Session';
        const secondSessionName = 'My Discover Session 2';

        await unifiedTabs.editTabLabel(0, FIRST_TAB_LABEL);
        await discover.waitUntilTabIsLoaded();

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.editTabLabel(1, testTabLabel);
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.closeTab(1);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([FIRST_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([testTabLabel]);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
        expect(await unifiedTabs.getTabLabels()).toStrictEqual([FIRST_TAB_LABEL, SECOND_TAB_LABEL]);

        await discover.saveSearch(firstSessionName);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([FIRST_TAB_LABEL, SECOND_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([testTabLabel]);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        expect(await unifiedTabs.getTabLabels()).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
          UNTITLED_TAB_LABEL,
        ]);

        await discover.saveSearchAsNew(secondSessionName);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
          UNTITLED_TAB_LABEL,
        ]);
        expect(await unifiedTabs.getRecentlyClosedRootTitles()).toStrictEqual([
          '3 tabs',
          testTabLabel,
        ]);
        expect(await unifiedTabs.getRecentlyClosedGroupTabTitles(0)).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
          UNTITLED_TAB_LABEL,
        ]);
      }
    );

    spaceTest(
      'updates recently closed tabs after starting a new discover session',
      async ({ pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const testTabLabel = 'My test tab';
        const tabWithFilterLabel = 'Tab with filter';

        await unifiedTabs.editTabLabel(0, FIRST_TAB_LABEL);
        await discover.waitUntilTabIsLoaded();

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.editTabLabel(1, testTabLabel);
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.closeTab(1);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([FIRST_TAB_LABEL]);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([FIRST_TAB_LABEL, SECOND_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([testTabLabel]);

        await discover.clickNewSearch();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.editTabLabel(0, tabWithFilterLabel);
        await discover.writeAndSubmitKqlQuery(KQL_QUERY);

        expect(await discover.getHitCountInt()).toBe(2_784);
        expect(await unifiedTabs.getTabLabels()).toStrictEqual([tabWithFilterLabel]);
        expect(await unifiedTabs.getRecentlyClosedRootTitles()).toStrictEqual([
          '2 tabs',
          testTabLabel,
        ]);
        expect(await unifiedTabs.getRecentlyClosedGroupTabTitles(0)).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
        ]);

        await discover.loadSavedSearch(testData.SAVED_SEARCH_TITLE);
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getHitCountInt()).toBe(14_004);
        expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedRootTitles()).toStrictEqual([
          tabWithFilterLabel,
          '2 tabs',
          testTabLabel,
        ]);
        expect(await unifiedTabs.getRecentlyClosedGroupTabTitles(0)).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
        ]);

        await discover.clickNewSearch();
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getHitCountInt()).toBe(14_004);
        expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedRootTitles()).toStrictEqual([
          UNTITLED_TAB_LABEL,
          tabWithFilterLabel,
          '2 tabs',
          testTabLabel,
        ]);
        expect(await unifiedTabs.getRecentlyClosedGroupTabTitles(0)).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
        ]);

        await unifiedTabs.restoreRecentlyClosedTab(1);
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getHitCountInt()).toBe(2_784);
        expect(await unifiedTabs.getTabLabels()).toStrictEqual([
          UNTITLED_TAB_LABEL,
          tabWithFilterLabel,
        ]);
        expect(await unifiedTabs.getRecentlyClosedRootTitles()).toStrictEqual([
          UNTITLED_TAB_LABEL,
          tabWithFilterLabel,
          '2 tabs',
          testTabLabel,
        ]);
        expect(await unifiedTabs.getRecentlyClosedGroupTabTitles(0)).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
        ]);
      }
    );

    spaceTest(
      'pushes previous tabs to recently closed list after reopening a discover session',
      async ({ pageObjects }) => {
        const { discover, queryBar, unifiedTabs } = pageObjects;
        const firstSessionName = 'Session1';
        const secondSessionName = 'Session2';

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);
        expect(await discover.getHitCountInt()).toBe(14_004);

        await discover.saveSearch(firstSessionName);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);
        expect(await discover.getHitCountInt()).toBe(14_004);
        expect(await discover.getCurrentQueryName()).toBe(firstSessionName);
        await discover.unsavedChangesIndicator().waitFor({ state: 'hidden' });

        await discover.writeAndSubmitKqlQuery(KQL_QUERY);

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);
        expect(await discover.getHitCountInt()).toBe(2_784);
        await discover.unsavedChangesIndicator().waitFor({ state: 'visible' });

        await discover.saveSearchAsNew(secondSessionName);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
        expect(await discover.getHitCountInt()).toBe(2_784);
        expect(await queryBar.getQuery()).toBe(KQL_QUERY);
        expect(await discover.getCurrentQueryName()).toBe(secondSessionName);
        await discover.unsavedChangesIndicator().waitFor({ state: 'hidden' });

        await discover.loadSavedSearch(firstSessionName);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([
          UNTITLED_TAB_LABEL,
          UNTITLED_TAB_LABEL,
        ]);
        expect(await discover.getHitCountInt()).toBe(14_004);
        expect(await queryBar.getQuery()).toBe('');
        expect(await discover.getCurrentQueryName()).toBe(firstSessionName);
        await discover.unsavedChangesIndicator().waitFor({ state: 'hidden' });

        await discover.loadSavedSearch(secondSessionName);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([UNTITLED_TAB_LABEL]);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([
          UNTITLED_TAB_LABEL,
          UNTITLED_TAB_LABEL,
        ]);
        expect(await discover.getHitCountInt()).toBe(2_784);
        expect(await queryBar.getQuery()).toBe(KQL_QUERY);
        expect(await discover.getCurrentQueryName()).toBe(secondSessionName);
        await discover.unsavedChangesIndicator().waitFor({ state: 'hidden' });
      }
    );
  }
);
