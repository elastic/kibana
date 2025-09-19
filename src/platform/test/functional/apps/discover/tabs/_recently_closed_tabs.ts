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

  describe('recently closed tabs', function () {
    it('should start with no recently closed tabs', async () => {
      const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabLabels();
      expect(recentlyClosedTabs.length).to.be(0);
    });

    it('should restore a tab after it was closed manually', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, 'My second tab');
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'jpg' });
      await discover.waitUntilTabIsLoaded();
      const query = 'machine.os: "ios"';
      await queryBar.setQuery(query);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.closeTab(1);
      await discover.waitUntilTabIsLoaded();
      expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled']);
      // appeared in the recently closed tabs list
      await retry.try(async () => {
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabLabels();
        expect(recentlyClosedTabs).to.eql(['My second tab']);
      });
      // restore it
      await unifiedTabs.restoreRecentlyClosedTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled', 'My second tab']);
      expect(await filterBar.hasFilter('extension', 'jpg')).to.be(true);
      expect(await queryBar.getQueryString()).to.be(query);
      // still on the recently closed tabs list
      await retry.try(async () => {
        const recentlyClosedTabs = await unifiedTabs.getRecentlyClosedTabLabels();
        expect(recentlyClosedTabs).to.eql(['My second tab']);
      });
    });

    // it('should update recently closed tabs after one of open tabs gets closed', async () => {});
    //
    // it('should update recently closed tabs after a new discover session is started', async () => {});
  });
}
