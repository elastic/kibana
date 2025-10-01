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
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');

  const { discover, unifiedTabs } = getPageObjects(['discover', 'unifiedTabs']);

  const QUERY1 = 'machine.os: "ios"';
  const QUERY2 = 'machine.os: "win"';

  describe('unsaved changes', () => {
    it('shows unsaved changes after altering state post-save', async () => {
      const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

      await discover.saveSearch(SEARCH_NAME);

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();

      const selectedTab = await unifiedTabs.getSelectedTab();
      const tabUnsavedIndicator = await unifiedTabs.getTabUnsavedIndicatorTestSubj(
        selectedTab?.element
      );
      await testSubjects.missingOrFail(tabUnsavedIndicator);

      await queryBar.setQuery(QUERY1);
      await queryBar.submitQuery();

      await testSubjects.existOrFail(tabUnsavedIndicator);
      await testSubjects.existOrFail('unsavedChangesBadge');
    });

    it('clears unsaved changes badge on session save', async () => {
      const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

      await discover.saveSearch(SEARCH_NAME);

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();

      const selectedTab = await unifiedTabs.getSelectedTab();
      const tabUnsavedIndicator = await unifiedTabs.getTabUnsavedIndicatorTestSubj(
        selectedTab?.element
      );

      await testSubjects.missingOrFail(tabUnsavedIndicator);

      await queryBar.setQuery(QUERY1);
      await queryBar.submitQuery();

      await testSubjects.existOrFail(tabUnsavedIndicator);
      await testSubjects.existOrFail('unsavedChangesBadge');

      await discover.saveSearch(SEARCH_NAME);

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();

      await testSubjects.missingOrFail(tabUnsavedIndicator);
      await testSubjects.missingOrFail('unsavedChangesBadge');
    });

    it('reverts unsaved changes in all tabs after clicking revert changes button', async () => {
      const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

      const selectedTab1 = await unifiedTabs.getSelectedTab();
      const tab1UnsavedIndicator = await unifiedTabs.getTabUnsavedIndicatorTestSubj(
        selectedTab1?.element
      );

      await unifiedTabs.createNewTab();

      const selectedTab2 = await unifiedTabs.getSelectedTab();
      const tab2UnsavedIndicator = await unifiedTabs.getTabUnsavedIndicatorTestSubj(
        selectedTab2?.element
      );

      await discover.saveSearch(SEARCH_NAME);

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();

      await queryBar.setQuery(QUERY2);
      await queryBar.submitQuery();

      await testSubjects.existOrFail(tab2UnsavedIndicator);
      await testSubjects.existOrFail('unsavedChangesBadge');

      await unifiedTabs.selectTab(0);
      await queryBar.setQuery(QUERY1);
      await queryBar.submitQuery();

      await testSubjects.existOrFail(tab1UnsavedIndicator);
      await testSubjects.existOrFail('unsavedChangesBadge');

      await testSubjects.click('unsavedChangesBadge');
      await testSubjects.click('revertUnsavedChangesButton');

      await testSubjects.missingOrFail(tab1UnsavedIndicator);
      await testSubjects.missingOrFail(tab2UnsavedIndicator);
      await testSubjects.missingOrFail('unsavedChangesBadge');
    });

    it('persists unsaved state for modified tabs across a refresh and clears it upon saving', async () => {
      const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

      const selectedTab1 = await unifiedTabs.getSelectedTab();
      const tab1UnsavedIndicator = await unifiedTabs.getTabUnsavedIndicatorTestSubj(
        selectedTab1?.element
      );

      await unifiedTabs.createNewTab();

      const selectedTab2 = await unifiedTabs.getSelectedTab();
      const tab2UnsavedIndicator = await unifiedTabs.getTabUnsavedIndicatorTestSubj(
        selectedTab2?.element
      );

      await unifiedTabs.createNewTab();

      const selectedTab3 = await unifiedTabs.getSelectedTab();
      const tab3UnsavedIndicator = await unifiedTabs.getTabUnsavedIndicatorTestSubj(
        selectedTab3?.element
      );

      await discover.saveSearch(SEARCH_NAME);

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();

      await unifiedTabs.selectTab(0);
      await queryBar.setQuery(QUERY1);
      await queryBar.submitQuery();

      await testSubjects.existOrFail(tab1UnsavedIndicator);
      await testSubjects.existOrFail('unsavedChangesBadge');

      await unifiedTabs.selectTab(1);
      await queryBar.setQuery(QUERY2);
      await queryBar.submitQuery();

      await testSubjects.existOrFail(tab2UnsavedIndicator);
      await testSubjects.existOrFail('unsavedChangesBadge');
      await testSubjects.missingOrFail(tab3UnsavedIndicator);

      await browser.refresh();
      await discover.waitUntilTabIsLoaded();

      await testSubjects.existOrFail(tab1UnsavedIndicator);
      await testSubjects.existOrFail(tab2UnsavedIndicator);
      await testSubjects.missingOrFail(tab3UnsavedIndicator);
      await testSubjects.existOrFail('unsavedChangesBadge');

      await discover.saveSearch(SEARCH_NAME);

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();

      await testSubjects.missingOrFail(tab1UnsavedIndicator);
      await testSubjects.missingOrFail(tab2UnsavedIndicator);
      await testSubjects.missingOrFail('unsavedChangesBadge');
    });

    it('forces a refetch on previously modified tab when switching back after reverting changes', async () => {
      const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

      const selectedTab1 = await unifiedTabs.getSelectedTab();
      const tab1UnsavedIndicator = await unifiedTabs.getTabUnsavedIndicatorTestSubj(
        selectedTab1?.element
      );

      await discover.waitUntilSearchingHasFinished();
      const originalHitCount = await discover.getHitCount();

      await unifiedTabs.createNewTab();

      const selectedTab2 = await unifiedTabs.getSelectedTab();
      const tab2UnsavedIndicator = await unifiedTabs.getTabUnsavedIndicatorTestSubj(
        selectedTab2?.element
      );

      await testSubjects.missingOrFail(tab2UnsavedIndicator);

      await discover.saveSearch(SEARCH_NAME);

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();

      await unifiedTabs.selectTab(0);
      await queryBar.setQuery(QUERY1);
      await queryBar.submitQuery();
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.existOrFail(tab1UnsavedIndicator);
      await testSubjects.existOrFail('unsavedChangesBadge');

      const hitCountAfterChange = await discover.getHitCount();
      expect(hitCountAfterChange).to.not.equal(originalHitCount);

      await unifiedTabs.selectTab(1);
      await testSubjects.click('unsavedChangesBadge');
      await testSubjects.click('revertUnsavedChangesButton');

      await testSubjects.missingOrFail(tab1UnsavedIndicator);
      await testSubjects.missingOrFail('unsavedChangesBadge');

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await discover.waitUntilSearchingHasFinished();

      await retry.try(async () => {
        const hitCountAfterRevert = await discover.getHitCount();
        expect(hitCountAfterRevert).to.equal(originalHitCount);
      });
    });
  });
}
