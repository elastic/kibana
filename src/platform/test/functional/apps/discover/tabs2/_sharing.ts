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
  const { discover, unifiedTabs, share } = getPageObjects(['discover', 'unifiedTabs', 'share']);
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const browser = getService('browser');
  const esql = getService('esql');
  const dataViews = getService('dataViews');

  describe('tabs sharing', function () {
    beforeEach(async () => {
      await unifiedTabs.clearRecentlyClosedTabs();
    });

    afterEach(async () => {
      await discover.resetQueryMode();
      await browser.closeCurrentWindow();
      await browser.switchTab(0);
    });

    it('can share an unsaved tab', async () => {
      await unifiedTabs.editTabLabel(0, 'first tab');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('14,004');

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, 'second tab');
      await queryBar.setQuery('bytes > 1000');
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('12,653');
        expect(await unifiedTabs.getTabLabels()).to.eql(['first tab', 'second tab']);
      });

      await share.clickShareTopNavButton();
      const sharedUrl = await share.getSharedUrl();
      await browser.openNewTab();
      await browser.get(sharedUrl);
      await discover.waitUntilTabIsLoaded();

      // the shared link can be opened in a new browser tab, the Discover tabs are reset
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('12,653');
        expect(await queryBar.getQueryString()).to.be('bytes > 1000');
        expect(await unifiedTabs.getTabLabels()).to.eql(['first tab', 'second tab']);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).to.eql([]);
        expect(await unifiedTabs.getSelectedTabLabel()).to.eql('second tab');
      });

      // modify the opened tab state
      await unifiedTabs.editTabLabel(1, 'second tab (modified)');
      await queryBar.setQuery('bytes > 500');
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('13,129');

      // after a browser refresh in the original browser tab, the Discover tabs are restored
      await browser.closeCurrentWindow();
      await browser.switchTab(0);
      await browser.refresh();
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('12,653');
        expect(await queryBar.getQueryString()).to.be('bytes > 1000');
        expect(await unifiedTabs.getTabLabels()).to.eql(['first tab', 'second tab (modified)']);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).to.eql([]);
        expect(await unifiedTabs.getSelectedTabLabel()).to.eql('second tab (modified)');
      });

      // the shared link can be opened in a new browser tab where local storage is empty
      await browser.setLocalStorageItem('discover.tabs', '');
      await browser.openNewTab();
      await browser.get(sharedUrl);
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('12,653');
        expect(await queryBar.getQueryString()).to.be('bytes > 1000');
        expect(await unifiedTabs.getTabLabels()).to.eql(['second tab']);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).to.eql([]);
      });
    });

    it('can share one of the persisted tabs from a persisted session', async () => {
      await unifiedTabs.editTabLabel(0, 'esql1');
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, 'esql2');
      const queryEsql = 'FROM logstash-* | LIMIT 20';
      await esql.setEsqlEditorQuery(queryEsql);
      await esql.submitEsqlEditorQuery();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('20');
      expect(await unifiedTabs.getTabLabels()).to.eql(['esql1', 'esql2']);

      await discover.saveSearch('esql');
      await discover.waitUntilTabIsLoaded();

      await share.clickShareTopNavButton();
      const sharedUrl = await share.getSharedUrl();
      await browser.openNewTab();
      await browser.get(sharedUrl);
      await discover.waitUntilTabIsLoaded();

      // the shared link can be opened in a new browser tab - one of the existing tabs will be preselected
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('20');
        expect(await esql.getEsqlEditorQuery()).to.be(queryEsql);
        expect(await unifiedTabs.getSelectedTabLabel()).to.be('esql2');
        expect(await unifiedTabs.getTabLabels()).to.eql(['esql1', 'esql2']);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).to.eql([]);
        expect(await discover.getSavedSearchTitle()).to.be('esql');
      });

      // modify the opened tab state
      const queryEsqlModified = 'FROM logstash-* | LIMIT 22';
      await unifiedTabs.editTabLabel(1, 'esql2 (modified)');
      await esql.setEsqlEditorQuery(queryEsqlModified);
      await esql.submitEsqlEditorQuery();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('22');

      // after a browser refresh in the original browser tab, the Discover tabs are restored as modified
      await browser.closeCurrentWindow();
      await browser.switchTab(0);
      await browser.refresh();
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('20');
        expect(await esql.getEsqlEditorQuery()).to.be(queryEsql); // same as in the original URL
        expect(await unifiedTabs.getSelectedTabLabel()).to.be('esql2 (modified)');
        expect(await unifiedTabs.getTabLabels()).to.eql(['esql1', 'esql2 (modified)']);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).to.eql([]);
        expect(await discover.getSavedSearchTitle()).to.be('esql');
      });

      // the shared link can be opened in a new browser tab where local storage is empty
      await browser.setLocalStorageItem('discover.tabs', '');
      await browser.openNewTab();
      await browser.get(sharedUrl);
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('20');
        expect(await esql.getEsqlEditorQuery()).to.be(queryEsql);
        expect(await unifiedTabs.getSelectedTabLabel()).to.be('esql2');
        expect(await unifiedTabs.getTabLabels()).to.eql(['esql1', 'esql2']);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).to.eql([]);
        expect(await discover.getSavedSearchTitle()).to.be('esql');
      });
    });

    it('can share one of the unsaved tabs from a persisted session', async () => {
      await unifiedTabs.editTabLabel(0, 'saved');

      await discover.saveSearch('kql');
      await discover.waitUntilTabIsLoaded();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await dataViews.createFromSearchBar({
        name: 'logs',
        adHoc: true,
        hasTimeField: true,
      });
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, 'unsaved');
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'jpg' });
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('9,109');
      expect(await unifiedTabs.getTabLabels()).to.eql(['saved', 'unsaved']);

      await share.clickShareTopNavButton();
      const sharedUrl = await share.getSharedUrl();
      await share.closeShareModal();

      // reset what we have in local storage
      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await discover.clickNewSearchButton();
      await discover.waitUntilTabIsLoaded();

      // the shared link can be opened in a new browser tab - it will append the unsaved shared tab to the persisted session tabs
      await browser.openNewTab();
      await browser.get(sharedUrl);
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('9,109');
        expect(await filterBar.hasFilter('extension', 'jpg')).to.be(true);
        expect(await unifiedTabs.getSelectedTabLabel()).to.be('unsaved');
        expect(await unifiedTabs.getTabLabels()).to.eql(['saved', 'unsaved']);
        expect(await unifiedTabs.getRecentlyClosedTabTitles()).to.eql([
          'Untitled',
          'saved',
          'unsaved',
        ]);
        expect(await discover.getSavedSearchTitle()).to.be('kql');
        expect(await dataViews.isAdHoc()).to.be(true);
      });

      // modify the tab
      await unifiedTabs.editTabLabel(1, 'unsaved (modified)');
      await queryBar.setQuery('bytes > 1000');
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('8,830');

      // re-opening the same discover session should revert the changes
      await discover.loadSavedSearch('kql');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('14,004');
        expect(await filterBar.getFilterCount()).to.be(0);
        expect(await queryBar.getQueryString()).to.be('');
        expect(await unifiedTabs.getSelectedTabLabel()).to.be('saved');
        expect(await unifiedTabs.getTabLabels()).to.eql(['saved']);
        expect(await unifiedTabs.getRecentlyClosedTabTitles()).to.eql([
          'unsaved (modified)',
          'Untitled',
          'saved',
          'unsaved',
        ]);
        expect(await discover.getSavedSearchTitle()).to.be('kql');
        expect(await dataViews.isAdHoc()).to.be(false);
      });
    });
  });
}
