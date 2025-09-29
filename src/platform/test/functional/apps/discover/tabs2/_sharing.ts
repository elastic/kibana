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
  const retry = getService('retry');
  const browser = getService('browser');

  describe('sharing', function () {
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
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('12,653');
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled']);
      });
    });
  });
}
