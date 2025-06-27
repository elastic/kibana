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
  const { discover, timePicker, unifiedFieldList, unifiedTabs } = getPageObjects([
    'discover',
    'timePicker',
    'unifiedFieldList',
    'unifiedTabs',
  ]);
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');

  describe('duplication of a tab', function () {
    it('should restore the previous ui state', async () => {
      const expectSidebarFieldCount = async (count: number) => {
        expect(await unifiedFieldList.getSidebarSectionFieldCount('available')).to.be(count);
      };
      const expectHistogramHeight = async (height: number) => {
        expect(await discover.getHistogramHeight()).to.be(height);
      };

      const initialSidebarFieldCount = 48;
      const updatedSidebarSearchTerm = 'geo';
      const updatedSidebarFieldCount = 4;
      await expectSidebarFieldCount(initialSidebarFieldCount);
      await unifiedFieldList.findFieldByName(updatedSidebarSearchTerm);
      await retry.try(async () => {
        await expectSidebarFieldCount(updatedSidebarFieldCount);
      });

      const distance = 100;
      const initialHistogramHeight = await discover.getHistogramHeight();
      const updatedHistogramHeight = initialHistogramHeight + distance;
      await discover.resizeHistogramBy(distance);
      await retry.try(async () => {
        await expectHistogramHeight(updatedHistogramHeight);
      });

      const otherDistance = 50;
      const updatedHistogramHeight2 = updatedHistogramHeight + otherDistance;
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await discover.resizeHistogramBy(otherDistance);
      await retry.try(async () => {
        await expectHistogramHeight(updatedHistogramHeight2);
        await expectSidebarFieldCount(initialSidebarFieldCount);
      });

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        await expectHistogramHeight(updatedHistogramHeight);
        await expectSidebarFieldCount(updatedSidebarFieldCount);
      });

      await unifiedTabs.duplicateTab(0);
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        await expectHistogramHeight(updatedHistogramHeight);
        await expectSidebarFieldCount(updatedSidebarFieldCount);
      });

      await unifiedTabs.duplicateTab(2);
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        await expectHistogramHeight(updatedHistogramHeight2);
        await expectSidebarFieldCount(initialSidebarFieldCount);
      });
    });

    it('should restore the previous app and global states', async () => {
      const initialHitCount = await discover.getHitCount();
      const updatedHitCount = '270';
      expect(initialHitCount).to.be('14,004');
      await discover.chooseBreakdownField('geo.src');
      await queryBar.setQuery('geo.dest: "US"');
      await discover.waitUntilTabIsLoaded();
      await filterBar.addFilter({
        field: 'extension',
        operation: 'is',
        value: 'jpg',
      });
      await discover.waitUntilTabIsLoaded();
      await timePicker.setAbsoluteRange(
        'Sep 19, 2015 @ 06:31:44.000',
        'Sep 21, 2015 @ 06:31:44.000'
      );
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be(updatedHitCount);
        expect(await discover.getBreakdownFieldValue()).to.be('Breakdown by geo.src');
      });

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await timePicker.setDefaultAbsoluteRange();
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be(initialHitCount);
        expect(await discover.getBreakdownFieldValue()).to.be('No breakdown');
      });

      await unifiedTabs.duplicateTab(0);
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be(updatedHitCount);
        expect(await discover.getBreakdownFieldValue()).to.be('Breakdown by geo.src');
      });

      await unifiedTabs.duplicateTab(2);
      await discover.waitUntilTabIsLoaded();
      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be(initialHitCount);
        expect(await discover.getBreakdownFieldValue()).to.be('No breakdown');
      });
    });
  });
}
