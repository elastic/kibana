/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover, unifiedFieldList, unifiedTabs } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
    'unifiedFieldList',
    'unifiedTabs',
  ]);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');

  describe('tabs restorable state', function () {
    describe('sidebar', function () {
      it('should restore sidebar collapsible state', async function () {
        const expectState = async (state: boolean) => {
          expect(await discover.isSidebarPanelOpen()).to.be(state);
        };
        await expectState(true);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(true);
        await discover.closeSidebar();
        await expectState(false);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(true);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState(false);

        await discover.openSidebar();
      });

      it('should restore sidebar width', async function () {
        const distance = 100;
        const initialWidth = await discover.getSidebarWidth();
        const updatedWidth = initialWidth + distance;
        const expectState = async (state: number) => {
          expect(await discover.getSidebarWidth()).to.be(state);
        };
        await expectState(initialWidth);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(initialWidth);
        await discover.resizeSidebarBy(distance);
        await expectState(updatedWidth);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(initialWidth);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState(updatedWidth);
      });

      it('should restore sidebar filters', async function () {
        const initialCount = 48;
        const expectState = async (state: number) => {
          expect(await unifiedFieldList.getSidebarSectionFieldCount('available')).to.be(state);
        };
        await expectState(initialCount);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(initialCount);
        await unifiedFieldList.findFieldByName('i');
        await retry.try(async () => {
          await expectState(28);
        });

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(initialCount);
        await unifiedFieldList.findFieldByName('e');
        await retry.try(async () => {
          await expectState(42);
        });
        await unifiedFieldList.openSidebarFieldFilter();
        await testSubjects.click('typeFilter-number');
        await unifiedFieldList.closeSidebarFieldFilter();
        await retry.try(async () => {
          await expectState(4);
        });

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(initialCount);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await expectState(28);

        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        await expectState(4);

        await unifiedFieldList.clearFieldSearchInput();
        await unifiedFieldList.clearSidebarFieldFilters();
        await retry.try(async () => {
          await expectState(initialCount);
        });
      });
    });

    describe('data grid', function () {
      it('should restore the selected docs', async () => {
        const expectState = async (count: number) => {
          expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(count);
          expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(count > 0);
        };

        await expectState(0);

        await dataGrid.selectRow(1);
        await dataGrid.selectRow(3);
        await expectState(2);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expectState(0);

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await expectState(2);
      });

      it('should restore in-table search', async () => {
        expect(await dataGrid.getCurrentPageNumber()).to.be('1');

        const searchTerm = 'Sep 22, 2015 @ 18:16:13.025';
        const updatedActiveMatch = '2/3';
        await dataGrid.runInTableSearch(searchTerm);
        await dataGrid.goToNextInTableSearchMatch();
        await retry.try(async () => {
          expect(await dataGrid.getInTableSearchTerm()).to.be(searchTerm);
          expect(await dataGrid.getInTableSearchMatchesCounter()).to.be(updatedActiveMatch);
          expect(await dataGrid.getCurrentPageNumber()).to.be('3');
        });

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        expect(await dataGrid.getInTableSearchTerm()).to.be(null);
        expect(await dataGrid.getCurrentPageNumber()).to.be('1');

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await retry.try(async () => {
          expect(await dataGrid.getInTableSearchTerm()).to.be(searchTerm);
          expect(await dataGrid.getInTableSearchMatchesCounter()).to.be(updatedActiveMatch);
          expect(await dataGrid.getCurrentPageNumber()).to.be('3');
        });

        await dataGrid.exitInTableSearch();
        await retry.try(async () => {
          expect(await dataGrid.getInTableSearchTerm()).to.be(null);
          expect(await dataGrid.getCurrentPageNumber()).to.be('3');
        });
      });

      it('should restore scroll position', async () => {
        expect(await dataGrid.getScrollPosition()).to.eql({ scrollTop: 0, scrollLeft: 0 });
        await dataGrid.scrollTo(0, 300);
        await retry.try(async () => {
          expect(await dataGrid.getScrollPosition()).to.eql({ scrollTop: 300, scrollLeft: 0 });
        });
        expect(await dataGrid.getCurrentPageNumber()).to.be('1');

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        expect(await dataGrid.getScrollPosition()).to.eql({ scrollTop: 0, scrollLeft: 0 });
        expect(await dataGrid.getCurrentPageNumber()).to.be('1');
        await testSubjects.click('pagination-button-next');
        await retry.try(async () => {
          expect(await dataGrid.getCurrentPageNumber()).to.be('2');
        });
        await dataGrid.scrollTo(0, 500);

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        expect(await dataGrid.getScrollPosition()).to.eql({ scrollTop: 0, scrollLeft: 0 });
        expect(await dataGrid.getCurrentPageNumber()).to.be('1');

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        expect(await dataGrid.getScrollPosition()).to.eql({ scrollTop: 0, scrollLeft: 0 });
        expect(await dataGrid.getCurrentPageNumber()).to.be('1');
        const searchTerm = 'Sep 22, 2015 @ 18:16:13.025';
        await dataGrid.runInTableSearch(searchTerm);
        await retry.try(async () => {
          expect(await dataGrid.getCurrentPageNumber()).to.be('3');
        });
        await testSubjects.click('pagination-button-next');
        await retry.try(async () => {
          expect(await dataGrid.getCurrentPageNumber()).to.be('4');
        });

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await retry.try(async () => {
          expect(await dataGrid.getScrollPosition()).to.eql({ scrollTop: 300, scrollLeft: 0 });
          expect(await dataGrid.getCurrentPageNumber()).to.be('1');
        });

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await retry.try(async () => {
          expect(await dataGrid.getScrollPosition()).to.eql({ scrollTop: 500, scrollLeft: 0 });
          expect(await dataGrid.getCurrentPageNumber()).to.be('2');
        });

        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        await retry.try(async () => {
          expect(await dataGrid.getScrollPosition()).to.eql({ scrollTop: 0, scrollLeft: 0 });
          expect(await dataGrid.getCurrentPageNumber()).to.be('1');
        });

        await unifiedTabs.selectTab(3);
        await discover.waitUntilTabIsLoaded();
        await retry.try(async () => {
          expect(await dataGrid.getScrollPosition()).to.eql({ scrollTop: 0, scrollLeft: 0 });
          expect(await dataGrid.getCurrentPageNumber()).to.be('4'); // in-table search should not affect the manually selected page
          expect(await dataGrid.getInTableSearchTerm()).to.be(searchTerm);
        });
      });
    });
  });
}
