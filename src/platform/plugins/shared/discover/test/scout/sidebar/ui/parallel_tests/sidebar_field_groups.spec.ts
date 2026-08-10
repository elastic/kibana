/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags, testData } from '../fixtures';

spaceTest.describe('Discover sidebar field groups', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterEach(async ({ pageObjects }) => {
    await pageObjects.filterBar.removeAllFilters();
    await pageObjects.unifiedFieldList.cleanSidebarLocalStorage();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('shows available and meta field groups', async ({ pageObjects }) => {
    const { unifiedFieldList } = pageObjects;

    expect(await unifiedFieldList.doesSidebarShowFields()).toBe(true);

    const availableFields = await unifiedFieldList.getSidebarSectionFieldNames('available');
    expect(availableFields).toContain('extension');
    expect(availableFields).toContain('@message');
    await unifiedFieldList.expectAvailableFieldCount(testData.LOGSTASH_AVAILABLE_FIELD_COUNT);

    await unifiedFieldList.openSidebarSection('meta');
    await unifiedFieldList.expectSidebarSectionFieldCount(
      'meta',
      testData.LOGSTASH_META_FIELD_COUNT
    );
    const metaFields = await unifiedFieldList.getSidebarSectionFieldNames('meta');
    expect(metaFields).toContain('_id');
    expect(metaFields).toContain('_index');
    expect(metaFields).toContain('_score');
  });

  spaceTest(
    'tracks selected and popular fields across refresh',
    async ({ browserAuth, page, pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      // Selecting columns calls popularizeField, which requires indexPatterns.save and
      // persists counts on the data view. Security editor lacks that capability.
      await browserAuth.loginAsAdmin();
      await discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();

      await unifiedFieldList.clickFieldListItemAdd('extension');
      await unifiedFieldList.clickFieldListItemAdd('@message');
      // Popularity is persisted async via indexPatterns.save; wait before asserting it.
      await discover.waitUntilSearchingHasFinished();

      expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
        'extension',
        '@message',
      ]);
      await unifiedFieldList.expectSidebarSectionFieldCount('popular', 2);
      await unifiedFieldList.expectAvailableFieldCount(testData.LOGSTASH_AVAILABLE_FIELD_COUNT);

      await unifiedFieldList.clickFieldListItemRemove('@message');
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await unifiedFieldList.clickFieldListItemAdd('@message');
      await discover.waitUntilSearchingHasFinished();

      expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
        'extension',
        'bytes',
        '@message',
      ]);
      await unifiedFieldList.expectSidebarSectionFieldCount('popular', 3);

      const popularBeforeRefresh = await unifiedFieldList.getSidebarSectionFieldNames('popular');
      expect(popularBeforeRefresh).toContain('extension');
      expect(popularBeforeRefresh).toContain('@message');
      expect(popularBeforeRefresh).toContain('bytes');

      await page.reload();
      await discover.waitUntilTabIsLoaded();

      expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
        'extension',
        'bytes',
        '@message',
      ]);
      expect(await unifiedFieldList.getSidebarSectionFieldNames('popular')).toStrictEqual(
        popularBeforeRefresh
      );

      await unifiedFieldList.clickFieldListItemRemove('@message');
      await unifiedFieldList.clickFieldListItemRemove('extension');
      // createRuntimeField already waits for the tab/search to settle.
      await discover.createRuntimeField('test', `emit('test')`);

      try {
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'bytes',
        ]);

        const popularAfterRuntimeField = await unifiedFieldList.getSidebarSectionFieldNames(
          'popular'
        );
        expect(popularAfterRuntimeField[0]).toBe('test');
        expect(popularAfterRuntimeField).toContain('@message');
        expect(popularAfterRuntimeField).toContain('extension');
        expect(popularAfterRuntimeField).toContain('bytes');
        await unifiedFieldList.expectSidebarSectionFieldCount('popular', 4);
        await unifiedFieldList.expectAvailableFieldCount(
          testData.LOGSTASH_AVAILABLE_FIELD_COUNT + 1
        );

        await unifiedFieldList.clickFieldListItemAdd('clientip');
        await discover.waitUntilSearchingHasFinished();

        const popularAfterClientip = await unifiedFieldList.getSidebarSectionFieldNames('popular');
        expect(popularAfterClientip[0]).toBe('test');
        expect(popularAfterClientip).toContain('clientip');
        await unifiedFieldList.expectSidebarSectionFieldCount('popular', 5);
      } finally {
        await discover.deleteRuntimeField('test');
        await unifiedFieldList.clearFieldSearch();
      }
    }
  );

  spaceTest('passes filters down to field stats', async ({ pageObjects }) => {
    const { discover, filterBar, unifiedFieldList } = pageObjects;

    await unifiedFieldList.clickFieldListItem('extension');
    await unifiedFieldList.waitUntilFieldPopoverIsLoaded();
    const before = await unifiedFieldList.getFieldStatsTopValues().innerText();
    await unifiedFieldList.closeFieldPopover();

    await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'jpg' });
    await discover.waitUntilSearchingHasFinished();

    await unifiedFieldList.clickFieldListItem('extension');
    await unifiedFieldList.waitUntilFieldPopoverIsLoaded();
    const after = unifiedFieldList.getFieldStatsTopValues();
    await expect(after).toContainText('jpg');
    await expect(after).not.toHaveText(before);
    await unifiedFieldList.closeFieldPopover();
  });
});
