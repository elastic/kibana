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
  const { discover, unifiedTabs } = getPageObjects(['discover', 'unifiedTabs']);
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const retry = getService('retry');
  const browser = getService('browser');
  const esql = getService('esql');
  const monacoEditor = getService('monacoEditor');
  const dataViews = getService('dataViews');

  const untitledTabLabel = 'Untitled';
  const firstTabLabel = 'My first tab';
  const secondTabLabel = 'My second tab';

  describe('recently closed tabs', function () {
    beforeEach(async () => {
      await unifiedTabs.clearRecentlyClosedTabs();
    });

    afterEach(async () => {
      await discover.resetQueryMode();
    });

    it('should start with no recently closed tabs', async () => {
      const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
      expect(recentlyClosedTabs.length).to.be(0);
    });

    it('should restore a tab after it was closed manually', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, secondTabLabel);
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'jpg' });
      await discover.waitUntilTabIsLoaded();
      const query = 'machine.os: "ios"';
      await queryBar.setQuery(query);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.closeTab(1);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        // appeared in the recently closed tabs list
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([secondTabLabel]);
      });

      // restore it
      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel, secondTabLabel]);
        expect(await filterBar.hasFilter('extension', 'jpg')).to.be(true);
        expect(await queryBar.getQueryString()).to.be(query);
        // still on the recently closed tabs list
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([secondTabLabel]);
      });
    });

    it('should show relative time when a tab was closed', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, secondTabLabel);
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.closeTab(1);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        // appeared in the recently closed tabs list with relative time
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabLabels();
        expect(recentlyClosedTabs.length).to.be(1);
        expect(recentlyClosedTabs[0]).to.match(
          new RegExp(`^${secondTabLabel}\\n\\d+ (second|minute)s? ago$`)
        );
      });
    });

    it('should restore a tab after a page refresh', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, secondTabLabel);
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'jpg' });
      await discover.waitUntilTabIsLoaded();
      const query = 'machine.os: "ios"';
      await queryBar.setQuery(query);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('1,813');
      await unifiedTabs.closeTab(1);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        // appeared in the recently closed tabs list
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([secondTabLabel]);
      });

      // refresh the page to reset the discover runtime state
      await browser.refresh();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('14,004');

      // restore the tab
      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel, secondTabLabel]);
        expect(await filterBar.hasFilter('extension', 'jpg')).to.be(true);
        expect(await queryBar.getQueryString()).to.be(query);
        // still on the recently closed tabs list
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([secondTabLabel]);
        expect(await discover.getHitCount()).to.be('1,813');
      });

      await filterBar.removeFilter('extension');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('2,784');

      // can restore it again
      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([
          untitledTabLabel,
          secondTabLabel,
          secondTabLabel,
        ]);
        expect(await filterBar.hasFilter('extension', 'jpg')).to.be(true);
        expect(await queryBar.getQueryString()).to.be(query);
        // still on the recently closed tabs list
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([secondTabLabel]);
        expect(await discover.getHitCount()).to.be('1,813');
      });
    });

    it('should update recently closed tabs after a discover session is opened', async () => {
      const firstTabQuery = 'from logstash-* | limit 51';
      const secondTabQuery = 'from logstash-* | limit 52';

      await unifiedTabs.editTabLabel(0, firstTabLabel);
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();
      await esql.setEsqlEditorQuery(firstTabQuery);
      await esql.submitEsqlEditorQuery();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('51');

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, secondTabLabel);
      await esql.setEsqlEditorQuery(secondTabQuery);
      await esql.submitEsqlEditorQuery();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('52');

      expect(await unifiedTabs.getTabLabels()).to.eql([firstTabLabel, secondTabLabel]);

      await discover.loadSavedSearch('A Saved Search');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await dataViews.getSelectedName()).to.be('logstash-*');
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        expect(await discover.getHitCount()).to.be('14,004');
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([firstTabLabel, secondTabLabel]);
      });

      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel, firstTabLabel]);
        expect(await monacoEditor.getCodeEditorValue()).to.be(firstTabQuery);
        expect(await discover.getHitCount()).to.be('51');
      });

      await unifiedTabs.restoreRecentlyClosedTab(1);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([
          untitledTabLabel,
          firstTabLabel,
          secondTabLabel,
        ]);
        expect(await monacoEditor.getCodeEditorValue()).to.be(secondTabQuery);
        expect(await discover.getHitCount()).to.be('52');
      });
    });

    it('should handle recently closed tabs correctly after saving a new discover session', async () => {
      const testTabLabel = 'My test tab';

      await unifiedTabs.editTabLabel(0, firstTabLabel);
      await discover.waitUntilTabIsLoaded();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, testTabLabel);
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.closeTab(1);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([firstTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([testTabLabel]);
      });

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, secondTabLabel);

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([firstTabLabel, secondTabLabel]);
      });

      await discover.saveSearch('My Discover Session');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([firstTabLabel, secondTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([testTabLabel]);
      });

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([
          firstTabLabel,
          secondTabLabel,
          untitledTabLabel,
        ]);
      });

      await discover.saveSearch('My Discover Session 2', true);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([
          firstTabLabel,
          secondTabLabel,
          untitledTabLabel,
        ]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([
          firstTabLabel,
          secondTabLabel,
          untitledTabLabel,
          testTabLabel,
        ]);
      });
    });

    it('should update recently closed tabs after starting a new discover session', async () => {
      const testTabLabel = 'My test tab';

      await unifiedTabs.editTabLabel(0, firstTabLabel);
      await discover.waitUntilTabIsLoaded();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, testTabLabel);
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.closeTab(1);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([firstTabLabel]);
      });

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, secondTabLabel);

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([firstTabLabel, secondTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([testTabLabel]);
      });

      const tabWithFilterLabel = 'Tab with filter';
      await discover.clickNewSearchButton();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(0, tabWithFilterLabel);
      const query = 'machine.os: "ios"';
      await queryBar.setQuery(query);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('2,784');
        expect(await unifiedTabs.getTabLabels()).to.eql([tabWithFilterLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([firstTabLabel, secondTabLabel, testTabLabel]);
      });

      await discover.loadSavedSearch('A Saved Search');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('14,004');
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([
          tabWithFilterLabel,
          firstTabLabel,
          secondTabLabel,
          testTabLabel,
        ]);
      });

      await discover.clickNewSearchButton();
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('14,004');
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([
          untitledTabLabel,
          tabWithFilterLabel,
          firstTabLabel,
          secondTabLabel,
          testTabLabel,
        ]);
      });

      await unifiedTabs.restoreRecentlyClosedTab(1);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('2,784');
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel, tabWithFilterLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([
          untitledTabLabel,
          tabWithFilterLabel,
          firstTabLabel,
          secondTabLabel,
          testTabLabel,
        ]);
      });
    });

    it('should push previous tabs to recently closed list after reopening a discover session', async () => {
      const firstSession = 'Session1';
      const secondSession = 'Session2';

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([]);
        expect(await discover.getHitCount()).to.be('14,004');
      });

      await discover.saveSearch(firstSession);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([]);
        expect(await discover.getHitCount()).to.be('14,004');
        expect(await discover.getSavedSearchTitle()).to.be(firstSession);
        await discover.ensureNoUnsavedChangesIndicator();
      });

      const query = 'machine.os: "ios"';
      await queryBar.setQuery(query);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([]);
        expect(await discover.getHitCount()).to.be('2,784');
        await discover.ensureHasUnsavedChangesIndicator();
      });

      await discover.saveSearch(secondSession, true);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([untitledTabLabel]);
        expect(await discover.getHitCount()).to.be('2,784');
        expect(await queryBar.getQueryString()).to.be(query);
        expect(await discover.getSavedSearchTitle()).to.be(secondSession);
        await discover.ensureNoUnsavedChangesIndicator();
      });

      await discover.loadSavedSearch(firstSession);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([untitledTabLabel, untitledTabLabel]);
        expect(await discover.getHitCount()).to.be('14,004');
        expect(await queryBar.getQueryString()).to.be('');
        expect(await discover.getSavedSearchTitle()).to.be(firstSession);
        await discover.ensureNoUnsavedChangesIndicator();
      });

      await discover.loadSavedSearch(secondSession);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabTitles();
        expect(recentlyClosedTabs).to.eql([untitledTabLabel, untitledTabLabel]);
        expect(await discover.getHitCount()).to.be('2,784');
        expect(await queryBar.getQueryString()).to.be(query);
        expect(await discover.getSavedSearchTitle()).to.be(secondSession);
        await discover.ensureNoUnsavedChangesIndicator();
      });
    });
  });
}
