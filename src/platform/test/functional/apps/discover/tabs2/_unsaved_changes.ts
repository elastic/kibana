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
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');

  const { discover, unifiedTabs, common } = getPageObjects(['discover', 'unifiedTabs', 'common']);

  const QUERY1 = 'machine.os: "ios"';
  const QUERY2 = 'machine.os: "win"';

  describe('unsaved changes', () => {
    it('shows unsaved changes after altering state post-save', async () => {
      const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

      await discover.saveSearch(SEARCH_NAME);
      await discover.waitUntilTabIsLoaded();

      const selectedTab = await unifiedTabs.getSelectedTab();
      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab?.index)).to.be(false);

      await queryBar.setQuery(QUERY1);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab?.index)).to.be(true);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(true);
    });

    it('clears unsaved changes indicator on session save', async () => {
      const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

      await discover.saveSearch(SEARCH_NAME);
      await discover.waitUntilTabIsLoaded();

      const selectedTab = await unifiedTabs.getSelectedTab();
      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab?.index)).to.be(false);

      await queryBar.setQuery(QUERY1);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab?.index)).to.be(true);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(true);

      await discover.saveSearch(SEARCH_NAME);
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab?.index)).to.be(false);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);
    });

    it('reverts unsaved changes in all tabs after clicking revert changes button', async () => {
      const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

      const selectedTab1 = await unifiedTabs.getSelectedTab();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();

      const selectedTab2 = await unifiedTabs.getSelectedTab();

      await discover.saveSearch(SEARCH_NAME);
      await discover.waitUntilTabIsLoaded();

      await queryBar.setQuery(QUERY2);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab2?.index)).to.be(true);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(true);

      await unifiedTabs.selectTab(0);
      await queryBar.setQuery(QUERY1);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab1?.index)).to.be(true);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(true);

      await discover.revertUnsavedChanges();
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab1?.index)).to.be(false);
      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab2?.index)).to.be(false);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);
    });

    it('persists unsaved state for modified tabs across a refresh and clears it upon saving', async () => {
      const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

      const selectedTab1 = await unifiedTabs.getSelectedTab();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();

      const selectedTab2 = await unifiedTabs.getSelectedTab();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();

      const selectedTab3 = await unifiedTabs.getSelectedTab();

      await discover.saveSearch(SEARCH_NAME);
      await discover.waitUntilTabIsLoaded();

      await unifiedTabs.selectTab(0);
      await queryBar.setQuery(QUERY1);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab1?.index)).to.be(true);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(true);

      await unifiedTabs.selectTab(1);
      await queryBar.setQuery(QUERY2);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab2?.index)).to.be(true);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(true);
      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab3?.index)).to.be(false);

      await browser.refresh();
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab1?.index)).to.be(true);
      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab2?.index)).to.be(true);
      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab3?.index)).to.be(false);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(true);

      await discover.saveSearch(SEARCH_NAME);
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab1?.index)).to.be(false);
      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab2?.index)).to.be(false);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);
    });

    it('forces a refetch on previously modified tab when switching back after reverting changes', async () => {
      const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

      const selectedTab1 = await unifiedTabs.getSelectedTab();

      await discover.waitUntilSearchingHasFinished();
      const originalHitCount = await discover.getHitCount();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();

      const selectedTab2 = await unifiedTabs.getSelectedTab();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab2?.index)).to.be(false);

      await discover.saveSearch(SEARCH_NAME);
      await discover.waitUntilTabIsLoaded();

      await unifiedTabs.selectTab(0);
      await queryBar.setQuery(QUERY1);
      await queryBar.submitQuery();
      await discover.waitUntilSearchingHasFinished();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab1?.index)).to.be(true);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(true);

      const hitCountAfterChange = await discover.getHitCount();
      expect(hitCountAfterChange).to.not.equal(originalHitCount);

      await unifiedTabs.selectTab(1);
      await discover.revertUnsavedChanges();
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.hasUnsavedIndicator(selectedTab1?.index)).to.be(false);
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await discover.waitUntilSearchingHasFinished();

      await retry.try(async () => {
        const hitCountAfterRevert = await discover.getHitCount();
        expect(hitCountAfterRevert).to.equal(originalHitCount);
      });
    });

    describe('default app state', () => {
      afterEach(async () => {
        await kibanaServer.uiSettings.unset('defaultColumns');
      });

      it('does not show unsaved changes when default columns are applied to a saved tab', async () => {
        const SEARCH_NAME = `unsaved_changes_${Date.now()}`;

        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'Summary']);

        await discover.saveSearch(SEARCH_NAME);
        await discover.waitUntilTabIsLoaded();

        expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

        await kibanaServer.uiSettings.update({ defaultColumns: ['agent'] });
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();

        await discover.loadSavedSearch(SEARCH_NAME);
        await discover.waitUntilTabIsLoaded();

        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'agent']);
        expect(await discover.hasUnsavedChangesIndicator()).to.be(false);
      });
    });
  });
}
