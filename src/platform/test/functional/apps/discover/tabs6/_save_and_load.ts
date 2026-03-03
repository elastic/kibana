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
  const { discover, unifiedTabs, common } = getPageObjects(['discover', 'unifiedTabs', 'common']);
  const dataViews = getService('dataViews');
  const monacoEditor = getService('monacoEditor');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('tabs saving and loading', function () {
    before(async () => {
      await browser.setWindowSize(1600, 1200);
    });

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
