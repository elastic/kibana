/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../fixtures/common';

const FIRST_TAB_LABEL = 'Persisted data view';
const SECOND_TAB_LABEL = 'Ad hoc data view';
const THIRD_TAB_LABEL = 'ESQL';
const FOURTH_TAB_LABEL = 'Flights data view';

const FIRST_TAB_QUERY = 'test';
const SECOND_TAB_QUERY = 'extension : jpg';
const THIRD_TAB_QUERY = 'FROM logstash-* | SORT @timestamp DESC | LIMIT 50';
const FOURTH_TAB_DATA_VIEW = 'kibana_sample_data_flights';

spaceTest.describe(
  'Discover tabs - save and load sessions',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
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
      'loads a legacy session and saves extra tabs as a new session',
      async ({ pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const updatedSessionName = 'Updated legacy session';

        await spaceTest.step('load the legacy session', async () => {
          await discover.loadSavedSearch(testData.SAVED_SEARCH_TITLE);
          await discover.waitUntilTabIsLoaded();

          expect(await discover.getCurrentQueryName()).toBe(testData.SAVED_SEARCH_TITLE);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
          expect(await discover.getHitCount()).toBe('14,004');
        });

        await spaceTest.step('save an additional tab as a new session', async () => {
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);

          await discover.saveSearchAsNew(updatedSessionName);
          await discover.waitUntilTabIsLoaded();

          expect(await discover.getCurrentQueryName()).toBe(updatedSessionName);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);
        });

        await spaceTest.step('keep the legacy session single-tab', async () => {
          await discover.loadSavedSearch(testData.SAVED_SEARCH_TITLE);
          await discover.waitUntilTabIsLoaded();

          expect(await discover.getCurrentQueryName()).toBe(testData.SAVED_SEARCH_TITLE);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        });

        await spaceTest.step('load the new multi-tab session', async () => {
          await discover.loadSavedSearch(updatedSessionName);
          await discover.waitUntilTabIsLoaded();

          expect(await discover.getCurrentQueryName()).toBe(updatedSessionName);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);
        });
      }
    );

    spaceTest('saves and reloads data view and ESQL tabs', async ({ pageObjects }) => {
      const { discover, queryBar, unifiedFieldList, unifiedTabs } = pageObjects;
      const sessionName = `Multi tab Discover session ${Date.now()}`;

      await spaceTest.step('create a persisted data view tab', async () => {
        await discover.writeAndSubmitKqlQuery(FIRST_TAB_QUERY);
        await unifiedFieldList.clickFieldListItemAdd('referer');
        await unifiedTabs.editTabLabel(0, FIRST_TAB_LABEL);
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'referer',
        ]);
      });

      await spaceTest.step('create an ad hoc data view tab', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.createDataViewFromSearchBar({ name: 'logs', adHoc: true });
        await discover.writeAndSubmitKqlQuery(SECOND_TAB_QUERY);
        await unifiedFieldList.clickFieldListItemAdd('geo.src');
        await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getSelectedDataViewName()).toBe('logs*');
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'geo.src',
        ]);
      });

      await spaceTest.step('create an ESQL tab and save the session', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitEsqlQuery(THIRD_TAB_QUERY);
        await unifiedTabs.editTabLabel(2, THIRD_TAB_LABEL);

        expect(await discover.getHitCount()).toBe('50');
        expect(await discover.getEsqlQueryValue()).toBe(THIRD_TAB_QUERY);
        expect(await unifiedTabs.getTabLabels()).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
          THIRD_TAB_LABEL,
        ]);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await discover.saveSearch(sessionName);
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getCurrentQueryName()).toBe(sessionName);
        await expect(discover.unsavedChangesIndicator()).toBeHidden();
      });

      await spaceTest.step('reload and verify each tab state', async () => {
        await discover.clickNewSearch();
        await discover.loadSavedSearch(sessionName);
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getCurrentQueryName()).toBe(sessionName);
        expect(await unifiedTabs.getTabLabels()).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
          THIRD_TAB_LABEL,
        ]);
        await expect(discover.unsavedChangesIndicator()).toBeHidden();

        expect(await queryBar.getQuery()).toBe(FIRST_TAB_QUERY);
        expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'referer',
        ]);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await queryBar.getQuery()).toBe(SECOND_TAB_QUERY);
        expect(await discover.getSelectedDataViewName()).toBe('logs*');
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'geo.src',
        ]);

        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCount()).toBe('50');
        expect(await discover.getEsqlQueryValue()).toBe(THIRD_TAB_QUERY);
      });
    });

    spaceTest(
      'clears saved and unsaved tabs when starting a new session',
      async ({ pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const sessionName = `Clear tabs Discover session ${Date.now()}`;

        await spaceTest.step('clear a loaded multi-tab session', async () => {
          await unifiedTabs.editTabLabel(0, FIRST_TAB_LABEL);
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
          await discover.saveSearch(sessionName);
          await discover.waitUntilTabIsLoaded();

          expect(await unifiedTabs.getTabLabels()).toStrictEqual([
            FIRST_TAB_LABEL,
            SECOND_TAB_LABEL,
          ]);

          await discover.clickNewSearch();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        });

        await spaceTest.step('clear unsaved tabs', async () => {
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);

          await discover.clickNewSearch();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        });
      }
    );

    spaceTest(
      'saves and reloads tabs that were not re-initialized after refresh',
      async ({ page, pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const sessionName = `Uninitialized tabs session ${Date.now()}`;
        const firstEsqlQuery = 'FROM logstash-* | LIMIT 100';
        const secondEsqlQuery = `FROM ${FOURTH_TAB_DATA_VIEW} | LIMIT 50`;

        await spaceTest.step('create data view and ESQL tabs', async () => {
          await unifiedTabs.editTabLabel(0, FIRST_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await discover.createDataViewFromSearchBar({ name: 'logst', adHoc: true });
          await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe('logst*');

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await discover.writeAndSubmitEsqlQuery(firstEsqlQuery);
          await unifiedTabs.editTabLabel(2, THIRD_TAB_LABEL);
          expect(await discover.getEsqlQueryValue()).toBe(firstEsqlQuery);

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await discover.selectClassicMode();
          await discover.selectDataView(FOURTH_TAB_DATA_VIEW);
          await unifiedTabs.editTabLabel(3, FOURTH_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe(FOURTH_TAB_DATA_VIEW);

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await discover.writeAndSubmitEsqlQuery(secondEsqlQuery);
          expect(await discover.getEsqlQueryValue()).toBe(secondEsqlQuery);
        });

        await spaceTest.step('save after refresh without visiting all tabs', async () => {
          await page.reload();
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getEsqlQueryValue()).toBe(secondEsqlQuery);

          await discover.saveSearch(sessionName);
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getCurrentQueryName()).toBe(sessionName);
        });

        await spaceTest.step('load the session and restore each tab type', async () => {
          await discover.clickNewSearch();
          await discover.loadSavedSearch(sessionName);
          await discover.waitUntilTabIsLoaded();

          await expect(unifiedTabs.getTabs()).toHaveCount(5);

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getSelectedTabLabel()).toContain(FIRST_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);

          await unifiedTabs.selectTab(1);
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getSelectedTabLabel()).toContain(SECOND_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe('logst*');

          await unifiedTabs.selectTab(2);
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getSelectedTabLabel()).toBe(THIRD_TAB_LABEL);
          expect(await discover.getEsqlQueryValue()).toBe(firstEsqlQuery);

          await unifiedTabs.selectTab(3);
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getSelectedTabLabel()).toBe(FOURTH_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe(FOURTH_TAB_DATA_VIEW);

          await unifiedTabs.selectTab(4);
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getEsqlQueryValue()).toBe(secondEsqlQuery);
        });
      }
    );
  }
);
