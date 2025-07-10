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
  });
}
