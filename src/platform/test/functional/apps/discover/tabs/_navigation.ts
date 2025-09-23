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
  const { discover, unifiedTabs, header, context } = getPageObjects([
    'discover',
    'unifiedTabs',
    'header',
    'context',
  ]);
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const dataGrid = getService('dataGrid');

  describe('navigation', function () {
    it('should go back to the last active tab after returning from Surrounding Docs page', async () => {
      await discover.loadSavedSearch('A Saved Search');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCount()).to.be('14,004');
      expect(await discover.getSavedSearchTitle()).to.be('A Saved Search');

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, 'testing');
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'jpg' });
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('9,109');
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled', 'testing']);
      });

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(2, 'third tab');
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'png' });
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('1,373');
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled', 'testing', 'third tab']);
      });

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();

      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const rowActions = await dataGrid.getRowActions();
      await rowActions[1].click();
      await header.waitUntilLoadingHasFinished();
      await context.waitUntilContextLoadingHasFinished();
      expect(await filterBar.hasFilter('extension', 'jpg', false)).to.be(true);

      await testSubjects.click('breadcrumb breadcrumb-deepLinkId-discover first');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('9,109');
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled', 'testing', 'third tab']);
        expect(await filterBar.hasFilter('extension', 'jpg')).to.be(true);
        expect((await unifiedTabs.getSelectedTab())?.label).to.be('testing');
        expect(await discover.getSavedSearchTitle()).to.be('A Saved Search');
      });
    });

    it('should go back to the last active tab after returning from Single Doc page', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await unifiedTabs.editTabLabel(1, 'testing');
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'jpg' });
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('9,109');
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled', 'testing']);
      });

      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const rowActions = await dataGrid.getRowActions();
      await rowActions[0].click();
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('kbnDocViewer');

      await testSubjects.click('breadcrumb breadcrumb-deepLinkId-discover first');
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('9,109');
        expect(await unifiedTabs.getTabLabels()).to.eql(['Untitled', 'testing']);
        expect(await filterBar.hasFilter('extension', 'jpg')).to.be(true);
        expect((await unifiedTabs.getSelectedTab())?.label).to.be('testing');
        await testSubjects.existOrFail('breadcrumb first last');
      });
    });
  });
}
