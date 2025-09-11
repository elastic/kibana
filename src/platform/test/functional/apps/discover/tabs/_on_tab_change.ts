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
  const dataGrid = getService('dataGrid');

  describe('on tab change', function () {
    it('should close the DocViewer on tab change', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();

      await dataGrid.clickRowToggle({ rowIndex: 0 });
      expect(await dataGrid.isShowingDocViewer()).to.be(true);

      // when switching tabs
      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await dataGrid.isShowingDocViewer()).to.be(false);

      // when creating a new tab
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      expect(await dataGrid.isShowingDocViewer()).to.be(true);
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await dataGrid.isShowingDocViewer()).to.be(false);
    });

    it('should close the vis edit flyout on tab change', async () => {
      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();

      await discover.openLensEditFlyout();
      expect(await discover.isLensEditFlyoutOpen()).to.be(true);

      // when switching tabs
      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.isLensEditFlyoutOpen()).to.be(false);

      // when creating a new tab
      await discover.openLensEditFlyout();
      expect(await discover.isLensEditFlyoutOpen()).to.be(true);
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.isLensEditFlyoutOpen()).to.be(false);
    });
  });
}
