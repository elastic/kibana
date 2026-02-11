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
  const { discover, unifiedTabs, timePicker } = getPageObjects([
    'discover',
    'unifiedTabs',
    'timePicker',
  ]);
  const retry = getService('retry');

  const discoverSessionName = 'test';

  const initialTimeRange = {
    start: 'Sep 19, 2015 @ 06:31:44.000',
    end: 'Sep 23, 2015 @ 18:31:44.000',
  };
  const updatedTimeRange = {
    start: 'Sep 19, 2015 @ 06:31:44.000',
    end: 'Sep 20, 2015 @ 18:31:44.000',
  };
  const initialRefreshInterval = { interval: '60', units: 'Seconds', isPaused: true };
  const updatedRefreshInterval = { interval: '30', units: 'Seconds', isPaused: false };

  const checkInitialTimeConfiguration = async () => {
    await retry.try(async () => {
      const timeConfig = await timePicker.getTimeConfig();
      expect(timeConfig).to.eql(initialTimeRange);

      const refreshConfig = await timePicker.getRefreshConfig(false);
      expect(refreshConfig).to.eql(initialRefreshInterval);
    });
    expect(await discover.getHitCount()).to.be('14,004');
  };

  const checkUpdatedTimeConfiguration = async () => {
    await retry.try(async () => {
      const timeConfig = await timePicker.getTimeConfig();
      expect(timeConfig).to.eql(updatedTimeRange);

      const refreshConfig = await timePicker.getRefreshConfig(false);
      expect(refreshConfig).to.eql(updatedRefreshInterval);
    });
    expect(await discover.getHitCount()).to.be('4,589');
  };

  describe('tabs time range', function () {
    it('should not save different time ranges when the switch is off', async () => {
      await checkInitialTimeConfiguration();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();

      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();

      await timePicker.setAbsoluteRange(updatedTimeRange.start, updatedTimeRange.end);
      await discover.waitUntilTabIsLoaded();
      await timePicker.startAutoRefresh(30);
      await discover.waitUntilTabIsLoaded();
      await checkUpdatedTimeConfiguration();

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await checkUpdatedTimeConfiguration();

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();

      await discover.saveSearch(discoverSessionName);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

      await discover.clickNewSearchButton();
      await discover.waitUntilTabIsLoaded();

      await discover.loadSavedSearch(discoverSessionName);
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);
    });

    it('should save different time ranges when the switch is on', async () => {
      await discover.loadSavedSearch(discoverSessionName);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

      await checkInitialTimeConfiguration();

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

      await timePicker.setAbsoluteRange(updatedTimeRange.start, updatedTimeRange.end);
      await discover.waitUntilTabIsLoaded();
      await timePicker.startAutoRefresh(30);
      await discover.waitUntilTabIsLoaded();
      await checkUpdatedTimeConfiguration();
      // changing the time range shouldn't trigger the unsaved changes indicator for a discover session with a disabled time range setting
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

      await discover.saveSearch(discoverSessionName, false, { storeTimeRange: true });
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      await checkUpdatedTimeConfiguration();
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await checkInitialTimeConfiguration();
      expect(await discover.hasUnsavedChangesIndicator()).to.be(false);

      await timePicker.setAbsoluteRange(updatedTimeRange.start, updatedTimeRange.end);
      await discover.waitUntilTabIsLoaded();
      // changing the time range should trigger the unsaved changes indicator for a discover session with an enabled time range setting
      expect(await discover.hasUnsavedChangesIndicator()).to.be(true);
    });
  });
}
