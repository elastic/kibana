/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover, timePicker, unifiedFieldList, unifiedTabs, common } = getPageObjects([
    'discover',
    'timePicker',
    'unifiedFieldList',
    'unifiedTabs',
    'common',
  ]);
  const dataViews = getService('dataViews');
  const monacoEditor = getService('monacoEditor');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('tabs saving and loading', function () {
    afterEach(async () => {
      await discover.resetQueryMode();
    });

    describe('legacy Discover sessions', () => {
      const legacySessionName = 'A Saved Search';
      const updatedSessionName = 'Updated legacy session';

      it('should load a legacy Discover session into a single untitled tab', async () => {
        // Load legacy session
        await discover.loadSavedSearch(legacySessionName);
        await discover.waitUntilTabIsLoaded();

        // Validate loaded session
        expect(await discover.getSavedSearchTitle()).to.be(legacySessionName);
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled']);
        expect(await discover.getHitCount()).to.be.eql('14,004');
      });

      it('should allow adding additional tabs to a legacy session and saving as a new session', async () => {
        // Load legacy session
        await discover.loadSavedSearch(legacySessionName);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSavedSearchTitle()).to.be(legacySessionName);
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled']);

        // Create a second tab
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled', 'Untitled 2']);

        // Save as new session
        await discover.saveSearch(updatedSessionName, true);
        expect(await discover.getSavedSearchTitle()).to.be(updatedSessionName);
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled', 'Untitled 2']);

        // Load legacy session again
        await discover.loadSavedSearch(legacySessionName);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSavedSearchTitle()).to.be(legacySessionName);
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled']);

        // Load updated session again
        await discover.loadSavedSearch(updatedSessionName);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSavedSearchTitle()).to.be(updatedSessionName);
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled', 'Untitled 2']);
      });
    });

    describe('multi-tab Discover sessions', () => {
      const sessionName = 'Multi-tab Discover session';

      const persistedTabLabel = 'Persisted data view';
      const persistedTabQuery = 'test';
      const persistedTabTime = {
        start: 'Sep 20, 2015 @ 00:00:00.000',
        end: 'Sep 22, 2015 @ 00:00:00.000',
      };
      const persistedTabDataView = 'logstash-*';
      const persistedTabColumn1 = 'referer';
      const persistedTabColumn2 = 'bytes';
      const persistedTabHitCount = '9';
      const persistedTabChartIntervalTitle = 'Hour';
      const persistedTabChartIntervalValue = 'h';

      const adHocTabLabel = 'Ad hoc data view';
      const adHocTabQuery = 'extension : jpg';
      const adHocTabTime = {
        start: 'Sep 20, 2015 @ 06:00:00.000',
        end: 'Sep 22, 2015 @ 06:00:00.000',
      };
      const adHocTabDataView = 'logs*';
      const adHocTabColumn1 = 'geo.src';
      const adHocTabColumn2 = 'bytes';
      const adHocTabHitCount = '6,045';

      const esqlTabLabel = 'ES|QL';
      const esqlTabQuery = 'FROM logstash-* | SORT @timestamp DESC | LIMIT 50';
      const esqlTabTime = {
        start: 'Sep 20, 2015 @ 12:00:00.000',
        end: 'Sep 22, 2015 @ 12:00:00.000',
      };
      const esqlTabVisShape = 'Line';
      const esqlTabHitCount = '50';

      it('should support saving a multi-tab Discover session', async () => {
        // Persisted data view tab
        await timePicker.setAbsoluteRange(persistedTabTime.start, persistedTabTime.end);
        await queryBar.setQuery(persistedTabQuery);
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.clickFieldListItemAdd(persistedTabColumn1);
        await unifiedTabs.editTabLabel(0, persistedTabLabel);
        await discover.setChartInterval(persistedTabChartIntervalTitle);
        expect(await discover.getHitCount()).to.be(persistedTabHitCount);

        // Ad hoc data view tab
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await timePicker.setAbsoluteRange(adHocTabTime.start, adHocTabTime.end);
        await dataViews.createFromSearchBar({
          name: 'logs',
          adHoc: true,
          hasTimeField: true,
        });
        await discover.waitUntilTabIsLoaded();
        await queryBar.setQuery(adHocTabQuery);
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.clickFieldListItemAdd(adHocTabColumn1);
        await unifiedTabs.editTabLabel(1, adHocTabLabel);
        expect(await discover.getHitCount()).to.be(adHocTabHitCount);

        // ES|QL tab
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await timePicker.setAbsoluteRange(esqlTabTime.start, esqlTabTime.end);
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue(esqlTabQuery);
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();
        await discover.changeVisShape(esqlTabVisShape);
        await unifiedTabs.editTabLabel(2, esqlTabLabel);
        expect(await discover.getHitCount()).to.be(esqlTabHitCount);

        // Switch back to first tab and refresh
        await unifiedTabs.selectTab(0);
        await browser.refresh();
        await discover.waitUntilTabIsLoaded();

        // Validate tab labels
        expect(await unifiedTabs.getTabLabels()).to.eql([
          persistedTabLabel,
          adHocTabLabel,
          esqlTabLabel,
        ]);

        // Validate persisted tab
        expect(await discover.getHitCount()).to.be(persistedTabHitCount);
        expect(await queryBar.getQueryString()).to.be(persistedTabQuery);
        expect(await discover.getChartInterval()).to.be(persistedTabChartIntervalValue);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).to.eql([
          persistedTabColumn1,
        ]);
        expect(await dataViews.getSelectedName()).to.be(persistedTabDataView);
        expect(await timePicker.getTimeConfig()).to.eql(persistedTabTime);

        // Validate ad hoc tab
        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCount()).to.be(adHocTabHitCount);
        expect(await queryBar.getQueryString()).to.be(adHocTabQuery);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).to.eql([
          adHocTabColumn1,
        ]);
        expect(await dataViews.getSelectedName()).to.be(adHocTabDataView);
        expect(await timePicker.getTimeConfig()).to.eql(adHocTabTime);

        // Validate ES|QL tab
        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCount()).to.be(esqlTabHitCount);
        expect(await monacoEditor.getCodeEditorValue()).to.be(esqlTabQuery);
        expect(await discover.getCurrentVisTitle()).to.be(esqlTabVisShape);
        expect(await timePicker.getTimeConfig()).to.eql(esqlTabTime);

        // Switch back to first tab and refresh
        await unifiedTabs.selectTab(0);
        await browser.refresh();
        await discover.waitUntilTabIsLoaded();

        // Validate after refresh
        expect(await unifiedTabs.getTabLabels()).to.eql([
          persistedTabLabel,
          adHocTabLabel,
          esqlTabLabel,
        ]);

        // Save the Discover session
        await discover.saveSearch(sessionName, undefined, { storeTimeRange: true });
        expect(await discover.getSavedSearchTitle()).to.be(sessionName);

        // Confirm no unsaved changes indicator after saving
        await discover.ensureNoUnsavedChangesIndicator();

        // Validate persisted tab
        expect(await discover.getHitCount()).to.be(persistedTabHitCount);
        expect(await queryBar.getQueryString()).to.be(persistedTabQuery);
        expect(await discover.getChartInterval()).to.be(persistedTabChartIntervalValue);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).to.eql([
          persistedTabColumn1,
        ]);
        expect(await dataViews.getSelectedName()).to.be(persistedTabDataView);
        expect(await timePicker.getTimeConfig()).to.eql(persistedTabTime);

        // Validate ad hoc tab
        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCount()).to.be(adHocTabHitCount);
        expect(await queryBar.getQueryString()).to.be(adHocTabQuery);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).to.eql([
          adHocTabColumn1,
        ]);
        expect(await dataViews.getSelectedName()).to.be(adHocTabDataView);
        expect(await timePicker.getTimeConfig()).to.eql(adHocTabTime);

        // Validate ES|QL tab
        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCount()).to.be(esqlTabHitCount);
        expect(await monacoEditor.getCodeEditorValue()).to.be(esqlTabQuery);
        expect(await discover.getCurrentVisTitle()).to.be(esqlTabVisShape);
        expect(await timePicker.getTimeConfig()).to.eql(esqlTabTime);
      });

      it('should support loading a multi-tab Discover session', async () => {
        // Load the Discover session
        await discover.loadSavedSearch(sessionName);
        await discover.waitUntilTabIsLoaded();

        // Validate loaded session
        expect(await discover.getSavedSearchTitle()).to.be(sessionName);
        expect(await unifiedTabs.getTabLabels()).to.eql([
          persistedTabLabel,
          adHocTabLabel,
          esqlTabLabel,
        ]);

        // Confirm no unsaved changes indicator after loading
        await discover.ensureNoUnsavedChangesIndicator();

        // Validate persisted tab
        expect(await discover.getHitCount()).to.be(persistedTabHitCount);
        expect(await queryBar.getQueryString()).to.be(persistedTabQuery);
        expect(await discover.getChartInterval()).to.be(persistedTabChartIntervalValue);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).to.eql([
          persistedTabColumn1,
        ]);
        expect(await dataViews.getSelectedName()).to.be(persistedTabDataView);
        expect(await timePicker.getTimeConfig()).to.eql(persistedTabTime);

        // Validate ad hoc tab
        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCount()).to.be(adHocTabHitCount);
        expect(await queryBar.getQueryString()).to.be(adHocTabQuery);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).to.eql([
          adHocTabColumn1,
        ]);
        expect(await dataViews.getSelectedName()).to.be(adHocTabDataView);
        expect(await timePicker.getTimeConfig()).to.eql(adHocTabTime);

        // Validate ES|QL tab
        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCount()).to.be(esqlTabHitCount);
        expect(await monacoEditor.getCodeEditorValue()).to.be(esqlTabQuery);
        expect(await discover.getCurrentVisTitle()).to.be(esqlTabVisShape);
        expect(await timePicker.getTimeConfig()).to.eql(esqlTabTime);
      });

      it('should locally persist unsaved changes to a multi-tab Discover session', async () => {
        // Load the Discover session
        await discover.loadSavedSearch(sessionName);
        await discover.waitUntilTabIsLoaded();

        // Prepare unsaved changes per tab
        const persistedUnsaved = {
          time: { start: 'Sep 20, 2015 @ 01:00:00.000', end: 'Sep 22, 2015 @ 01:00:00.000' },
          query: 'test and extension : png',
          columns: [persistedTabColumn1, persistedTabColumn2],
        };
        const adHocUnsaved = {
          time: { start: 'Sep 20, 2015 @ 07:00:00.000', end: 'Sep 22, 2015 @ 07:00:00.000' },
          query: 'extension : png',
          columns: [adHocTabColumn1, adHocTabColumn2],
        };
        const esqlUnsaved = {
          time: { start: 'Sep 20, 2015 @ 13:00:00.000', end: 'Sep 22, 2015 @ 13:00:00.000' },
          query: 'FROM logstash-* | SORT @timestamp DESC | LIMIT 25',
          visShape: 'Area',
        };

        // Persisted data view tab
        await timePicker.setAbsoluteRange(persistedUnsaved.time.start, persistedUnsaved.time.end);
        await queryBar.setQuery(persistedUnsaved.query);
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.clickFieldListItemAdd(persistedTabColumn2);
        const persistedUnsavedCount = await discover.getHitCount();

        // Ad hoc data view tab
        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await timePicker.setAbsoluteRange(adHocUnsaved.time.start, adHocUnsaved.time.end);
        await queryBar.setQuery(adHocUnsaved.query);
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.clickFieldListItemAdd(adHocTabColumn2);
        const adHocUnsavedCount = await discover.getHitCount();

        // ES|QL tab
        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        await timePicker.setAbsoluteRange(esqlUnsaved.time.start, esqlUnsaved.time.end);
        await monacoEditor.setCodeEditorValue(esqlUnsaved.query);
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();
        await discover.changeVisShape(esqlUnsaved.visShape);
        const esqlUnsavedCount = await discover.getHitCount();

        // Unsaved changes indicator should be visible after making changes
        await discover.ensureHasUnsavedChangesIndicator();

        // Refresh and ensure the unsaved changes are restored
        await browser.refresh();
        await discover.waitUntilTabIsLoaded();

        // Validate persisted data view tab
        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        expect(await queryBar.getQueryString()).to.be(persistedUnsaved.query);
        expect(await timePicker.getTimeConfig()).to.eql(persistedUnsaved.time);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).to.eql(
          persistedUnsaved.columns
        );
        expect(await discover.getHitCount()).to.be(persistedUnsavedCount);

        // Validate ad hoc data view tab
        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await queryBar.getQueryString()).to.be(adHocUnsaved.query);
        expect(await timePicker.getTimeConfig()).to.eql(adHocUnsaved.time);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).to.eql(
          adHocUnsaved.columns
        );
        expect(await discover.getHitCount()).to.be(adHocUnsavedCount);

        // Validate ES|QL tab
        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        expect(await monacoEditor.getCodeEditorValue()).to.be(esqlUnsaved.query);
        expect(await timePicker.getTimeConfig()).to.eql(esqlUnsaved.time);
        expect(await discover.getCurrentVisTitle()).to.be(esqlUnsaved.visShape);
        expect(await discover.getHitCount()).to.be(esqlUnsavedCount);

        // Unsaved indicator should still be visible after refresh
        await discover.ensureHasUnsavedChangesIndicator();
      });

      it('should clear all tabs when starting a new session', async () => {
        // Load the Discover session
        await discover.loadSavedSearch(sessionName);
        await discover.waitUntilTabIsLoaded();

        // Validate loaded session
        expect(await discover.getSavedSearchTitle()).to.be(sessionName);
        expect(await unifiedTabs.getTabLabels()).to.eql([
          persistedTabLabel,
          adHocTabLabel,
          esqlTabLabel,
        ]);

        // Clear loaded session
        await discover.clickNewSearchButton();
        await discover.waitUntilTabIsLoaded();

        // Validate cleared session
        expect(await discover.getSavedSearchTitle()).to.be(undefined);
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled']);

        // Add a second unsaved tab
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled', 'Untitled 2']);

        // Clear unsaved tabs
        await discover.clickNewSearchButton();
        await discover.waitUntilTabIsLoaded();

        // Validate cleared tabs
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled']);
      });
    });

    describe('time based tabs', () => {
      const adHocWithTimeRange = 'log';
      const adHocWithoutTimeRange = 'logs';
      const persistedWithoutTimeRange = 'logstas*';

      before(async () => {
        // Create saved data view without time range
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await dataViews.createFromSearchBar({
          name: 'logstas',
          adHoc: false,
          hasTimeField: false,
        });
      });

      it('should show time range switch when saving if any tab is time based', async () => {
        const expectTimeSwitchVisible = async () => {
          await discover.clickSaveSearchButton();
          await testSubjects.existOrFail('storeTimeWithSearch');
          await browser.pressKeys(browser.keys.ESCAPE);
          await testSubjects.missingOrFail('confirmSaveSavedObjectButton');
        };

        // Case A: Only persisted data view tab is time based; ad hoc data view is non-time-based; ES|QL is non-time-based
        // Initial tab uses default time-based data view

        // Tab 2: ad hoc data view without time field
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await dataViews.createFromSearchBar({
          name: adHocWithoutTimeRange,
          adHoc: true,
          hasTimeField: false,
        });
        await discover.waitUntilTabIsLoaded();

        // Tab 3: ES|QL non-time-based
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue('FROM without-timefield');
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();

        // Visit the time-based tab (persisted data view) and check
        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectTimeSwitchVisible();

        // Switch away, refresh so time-based tab is unvisited, then check
        await unifiedTabs.selectTab(1);
        await browser.refresh();
        await discover.waitUntilTabIsLoaded();
        await expectTimeSwitchVisible();

        // Case B: Only ad hoc data view tab is time based; persisted data view is non-time-based; ES|QL is non-time-based
        // Reset to a fresh session, then make Tab 1 persisted data view non-time-based
        await discover.clickNewSearchButton();
        await discover.waitUntilTabIsLoaded();
        await dataViews.switchToAndValidate(persistedWithoutTimeRange);
        await discover.waitUntilTabIsLoaded();

        // Tab 2: ad hoc data view with time field (time-based)
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await dataViews.createFromSearchBar({
          name: adHocWithTimeRange,
          adHoc: true,
          hasTimeField: true,
        });
        await discover.waitUntilTabIsLoaded();

        // Tab 3: ES|QL non-time-based
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue('FROM without-timefield');
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();

        // Visit the time-based tab (ad hoc data view) and check
        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectTimeSwitchVisible();

        // Switch away, refresh, then check
        await unifiedTabs.selectTab(0);
        await browser.refresh();
        await discover.waitUntilTabIsLoaded();
        await expectTimeSwitchVisible();

        // Case C: Only ES|QL tab is time based; both data view tabs non-time-based
        // Reset and build non-time-based data view tabs
        await discover.clickNewSearchButton();
        await discover.waitUntilTabIsLoaded();
        await dataViews.switchToAndValidate(persistedWithoutTimeRange);
        await discover.waitUntilTabIsLoaded();

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await dataViews.createFromSearchBar({
          name: adHocWithoutTimeRange,
          adHoc: true,
          hasTimeField: false,
        });
        await discover.waitUntilTabIsLoaded();

        // Tab 3: ES|QL time-based
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue('FROM logstash-* | SORT @timestamp DESC | LIMIT 10');
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();

        // Visit ES|QL time-based tab and check
        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        await expectTimeSwitchVisible();

        // Switch away, refresh, then check
        await unifiedTabs.selectTab(1);
        await browser.refresh();
        await discover.waitUntilTabIsLoaded();
        await expectTimeSwitchVisible();
      });

      it('should not show time range switch when saving if no tab is time based', async () => {
        const expectTimeSwitchMissing = async () => {
          await discover.clickSaveSearchButton();
          await testSubjects.missingOrFail('storeTimeWithSearch');
          await browser.pressKeys(browser.keys.ESCAPE);
          await testSubjects.missingOrFail('confirmSaveSavedObjectButton');
        };

        // Tab 1: persisted data view without time field
        await dataViews.switchToAndValidate(persistedWithoutTimeRange);
        await discover.waitUntilTabIsLoaded();

        // Tab 2: ad hoc data view without time field
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await dataViews.createFromSearchBar({
          name: adHocWithoutTimeRange,
          adHoc: true,
          hasTimeField: false,
        });
        await discover.waitUntilTabIsLoaded();

        // Tab 3: ES|QL non-time-based
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue('FROM without-timefield');
        await queryBar.clickQuerySubmitButton();
        await discover.waitUntilTabIsLoaded();

        // Perform check
        await expectTimeSwitchMissing();

        // Refresh, then check again
        await browser.refresh();
        await discover.waitUntilTabIsLoaded();
        await expectTimeSwitchMissing();
      });
    });
  });
}
