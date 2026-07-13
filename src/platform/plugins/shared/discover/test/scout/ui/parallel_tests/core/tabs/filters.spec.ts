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
    'carries over filters as where clauses when switching to ES query mode',
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

  spaceTest('uses the correct query and filters per tab', async ({ page, pageObjects }) => {
    const { discover, filterBar, queryBar, unifiedTabs } = pageObjects;

    await unifiedTabs.editTabLabel(0, 'no filters');
    await discover.waitUntilTabIsLoaded();
    expect(await queryBar.getQuery()).toBe('');
    expect(await filterBar.getFilterCount()).toBe(0);
    expect(await discover.getHitCount()).toBe('14,004');
    await page.testSubj.locator('xyVisChart').waitFor({ state: 'visible' });

    await unifiedTabs.createNewTab();
    await discover.waitUntilTabIsLoaded();
    await unifiedTabs.editTabLabel(1, 'query and app filters');
    await queryBar.setQuery('bytes > 100');
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();
    await filterBar.addFilter({ field: 'extension.raw', operator: 'is', value: 'gif' });
    await discover.waitUntilTabIsLoaded();
    expect(await queryBar.getQuery()).toBe('bytes > 100');
    expect(await filterBar.getFilterCount()).toBe(1);
    expect(
      await filterBar.hasFilter({
        field: 'extension.raw',
        value: 'gif',
        enabled: true,
        pinned: false,
      })
    ).toBe(true);
    expect(await discover.getHitCount()).toBe('795');
    await page.testSubj.locator('xyVisChart').waitFor({ state: 'visible' });

    await unifiedTabs.createNewTab();
    await discover.waitUntilTabIsLoaded();
    await unifiedTabs.editTabLabel(2, 'query, global and app filters');
    expect(await queryBar.getQuery()).toBe('');
    expect(await filterBar.getFilterCount()).toBe(0);
    await filterBar.addFilter({ field: '@message', operator: 'exists' });
    await discover.waitUntilTabIsLoaded();
    await filterBar.addFilter({ field: 'extension.raw', operator: 'is', value: 'jpg' });
    await discover.waitUntilTabIsLoaded();
    await filterBar.toggleFilterPinned('extension.raw');
    await discover.waitUntilTabIsLoaded();
    await queryBar.setQuery('machine.os: "ios"');
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();
    expect(await queryBar.getQuery()).toBe('machine.os: "ios"');
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
    expect(await discover.getHitCount()).toBe('1,813');
    await page.testSubj.locator('xyVisChart').waitFor({ state: 'visible' });

    await unifiedTabs.createNewTab();
    await discover.waitUntilTabIsLoaded();
    await unifiedTabs.editTabLabel(3, 'esql and no filters');
    expect(await queryBar.getQuery()).toBe('');
    expect(await filterBar.getFilterCount()).toBe(1);
    expect(
      await filterBar.hasFilter({
        field: 'extension.raw',
        value: 'jpg',
        enabled: true,
        pinned: true,
      })
    ).toBe(true);
    expect(await discover.getHitCount()).toBe('9,109');
    await discover.selectTextBaseLang();
    await discover.waitUntilTabIsLoaded();
    await discover.codeEditor.setCodeEditorValue(
      'FROM logstash-* | WHERE extension.raw == "png" and bytes > 10000'
    );
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();
    expect(await discover.getEsqlQueryValue()).toBe(
      'FROM logstash-* | WHERE extension.raw == "png" and bytes > 10000'
    );
    expect(await filterBar.getFilterCount()).toBe(0);
    expect(await discover.getHitCount()).toBe('721');
    await page.testSubj.locator('xyVisChart').waitFor({ state: 'visible' });

    await unifiedTabs.selectTab(0);
    await discover.waitUntilTabIsLoaded();
    expect(await queryBar.getQuery()).toBe('');
    expect(await filterBar.getFilterCount()).toBe(0);
    expect(await discover.getHitCount()).toBe('14,004');
    await page.testSubj.locator('xyVisChart').waitFor({ state: 'visible' });

    await unifiedTabs.selectTab(1);
    await discover.waitUntilTabIsLoaded();
    expect(await queryBar.getQuery()).toBe('bytes > 100');
    expect(await filterBar.getFilterCount()).toBe(1);
    expect(
      await filterBar.hasFilter({
        field: 'extension.raw',
        value: 'gif',
        enabled: true,
        pinned: false,
      })
    ).toBe(true);
    expect(await discover.getHitCount()).toBe('795');
    await page.testSubj.locator('xyVisChart').waitFor({ state: 'visible' });

    await unifiedTabs.selectTab(2);
    await discover.waitUntilTabIsLoaded();
    expect(await queryBar.getQuery()).toBe('machine.os: "ios"');
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
    expect(await discover.getHitCount()).toBe('1,813');
    await page.testSubj.locator('xyVisChart').waitFor({ state: 'visible' });

    await unifiedTabs.selectTab(3);
    await discover.waitUntilTabIsLoaded();
    expect(await discover.getEsqlQueryValue()).toBe(
      'FROM logstash-* | WHERE extension.raw == "png" and bytes > 10000'
    );
    expect(await filterBar.getFilterCount()).toBe(0);
    expect(await discover.getHitCount()).toBe('721');
    await page.testSubj.locator('xyVisChart').waitFor({ state: 'visible' });
  });
});
