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
    it('should start with no recently closed tabs', async () => {
      const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabLabels();
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
      expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
      // appeared in the recently closed tabs list
      await retry.try(async () => {
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabLabels();
        expect(recentlyClosedTabs).to.eql([secondTabLabel]);
      });
      // restore it
      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel, secondTabLabel]);
      expect(await filterBar.hasFilter('extension', 'jpg')).to.be(true);
      expect(await queryBar.getQueryString()).to.be(query);
      // still on the recently closed tabs list
      await retry.try(async () => {
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabLabels();
        expect(recentlyClosedTabs).to.eql([secondTabLabel]);
      });
    });

    it('should restore a tab after after a page refresh', async () => {
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
      expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
      // appeared in the recently closed tabs list
      await retry.try(async () => {
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabLabels();
        expect(recentlyClosedTabs).to.eql([secondTabLabel]);
      });
      // refresh the page to reset the discover runtime state
      await browser.refresh();
      await discover.waitUntilTabIsLoaded();
      // restore the tab
      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel, secondTabLabel]);
      expect(await filterBar.hasFilter('extension', 'jpg')).to.be(true);
      expect(await queryBar.getQueryString()).to.be(query);
      // still on the recently closed tabs list
      await retry.try(async () => {
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabLabels();
        expect(recentlyClosedTabs).to.eql([secondTabLabel]);
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
      });
      expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel]);
      expect(await discover.getHitCount()).to.be('14,004');

      await retry.try(async () => {
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabLabels();
        expect(recentlyClosedTabs).to.eql([firstTabLabel, secondTabLabel]);
      });

      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.getTabLabels()).to.eql([untitledTabLabel, firstTabLabel]);
      expect(await monacoEditor.getCodeEditorValue()).to.be(firstTabQuery);
      expect(await discover.getHitCount()).to.be('51');

      await unifiedTabs.restoreRecentlyClosedTab(1);
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedTabs.getTabLabels()).to.eql([
        untitledTabLabel,
        firstTabLabel,
        secondTabLabel,
      ]);
      expect(await monacoEditor.getCodeEditorValue()).to.be(secondTabQuery);
      expect(await discover.getHitCount()).to.be('52');
    });
  });
}
