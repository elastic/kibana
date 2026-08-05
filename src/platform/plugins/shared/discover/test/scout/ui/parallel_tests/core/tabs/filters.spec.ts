/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

spaceTest.describe('Discover tabs - filters', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'carries over filters as where clauses when switching to ES|QL mode',
    async ({ pageObjects }) => {
      const { discover, filterBar } = pageObjects;

      await filterBar.addFilter({ field: 'extension.raw', operator: 'is', value: 'css' });
      await discover.waitUntilTabIsLoaded();
      expect(await filterBar.getFilterCount()).toBe(1);

      await discover.selectTextBaseLang();
      await discover.waitUntilTabIsLoaded();

      expect(await discover.getEsqlQueryValue()).toContain('`extension.raw` : "css"');
      expect(await filterBar.getFilterCount()).toBe(0);

      await discover.submitQuery();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCountInt()).toBeGreaterThan(0);
    }
  );

  spaceTest('uses the correct query and filters per tab', async ({ pageObjects }) => {
    const { discover, filterBar, unifiedTabs } = pageObjects;

    await spaceTest.step('tab 0: start with no filters', async () => {
      expect(await filterBar.getFilterCount()).toBe(0);
    });

    await spaceTest.step('tab 1: add an app filter', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      await filterBar.addFilter({ field: 'extension.raw', operator: 'is', value: 'gif' });
      await discover.waitUntilTabIsLoaded();
      expect(await filterBar.getFilterCount()).toBe(1);
      expect(
        await filterBar.hasFilter({
          field: 'extension.raw',
          value: 'gif',
          enabled: true,
          pinned: false,
        })
      ).toBe(true);
    });

    await spaceTest.step('tab 2: add an app filter and pin another filter globally', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await filterBar.getFilterCount()).toBe(0);
      await filterBar.addFilter({ field: '@message', operator: 'exists' });
      await discover.waitUntilTabIsLoaded();
      await filterBar.addFilter({ field: 'extension.raw', operator: 'is', value: 'jpg' });
      await discover.waitUntilTabIsLoaded();
      await filterBar.toggleFilterPinned('extension.raw');
      await discover.waitUntilTabIsLoaded();
      expect(await filterBar.getFilterCount()).toBe(2);
      expect(
        await filterBar.hasFilter({
          field: '@message',
          value: 'exists',
          enabled: true,
          pinned: false,
        })
      ).toBe(true);
      expect(
        await filterBar.hasFilter({
          field: 'extension.raw',
          value: 'jpg',
          enabled: true,
          pinned: true,
        })
      ).toBe(true);
    });

    await spaceTest.step('tab 3: inherit only the pinned global filter', async () => {
      await unifiedTabs.createNewTab();
      await discover.waitUntilTabIsLoaded();
      expect(await filterBar.getFilterCount()).toBe(1);
      expect(
        await filterBar.hasFilter({
          field: 'extension.raw',
          value: 'jpg',
          enabled: true,
          pinned: true,
        })
      ).toBe(true);
    });

    await spaceTest.step('switching tabs restores the correct filters per tab', async () => {
      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      expect(await filterBar.getFilterCount()).toBe(0);

      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      expect(await filterBar.getFilterCount()).toBe(1);
      expect(
        await filterBar.hasFilter({
          field: 'extension.raw',
          value: 'gif',
          enabled: true,
          pinned: false,
        })
      ).toBe(true);

      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      expect(await filterBar.getFilterCount()).toBe(2);
      expect(
        await filterBar.hasFilter({
          field: '@message',
          value: 'exists',
          enabled: true,
          pinned: false,
        })
      ).toBe(true);
      expect(
        await filterBar.hasFilter({
          field: 'extension.raw',
          value: 'jpg',
          enabled: true,
          pinned: true,
        })
      ).toBe(true);

      await unifiedTabs.selectTab(3);
      await discover.waitUntilTabIsLoaded();
      expect(await filterBar.getFilterCount()).toBe(1);
      expect(
        await filterBar.hasFilter({
          field: 'extension.raw',
          value: 'jpg',
          enabled: true,
          pinned: true,
        })
      ).toBe(true);
    });
  });
});
