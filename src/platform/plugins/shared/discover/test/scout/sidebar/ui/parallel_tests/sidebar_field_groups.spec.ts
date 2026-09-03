/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BrowserAuthFixture, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { DiscoverPageObjects, DiscoverScoutSpace } from '../fixtures';
import { spaceTest, tags, testData } from '../fixtures';

const setFieldPopularity = async (
  kbnClient: KbnClient,
  discoverScoutSpace: DiscoverScoutSpace,
  fieldCounts: Record<string, number | null>
) => {
  const dataViewId = discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW);
  await kbnClient.request({
    method: 'POST',
    path: `/s/${discoverScoutSpace.id}/api/data_views/data_view/${dataViewId}/fields`,
    body: {
      fields: Object.fromEntries(
        Object.entries(fieldCounts).map(([fieldName, count]) => [fieldName, { count }])
      ),
    },
  });
};

/**
 *  Popularity tests need to select columns, which calls popularizeField. That
 *  requires indexPatterns.save and persists counts on the data view; Security editor
 *  lacks that capability, so they log in as admin.
 */
const loginAndOpenDiscover = async (
  browserAuth: BrowserAuthFixture,
  discover: DiscoverPageObjects['discover'],
  { asAdmin = false }: { asAdmin?: boolean } = {}
) => {
  await (asAdmin ? browserAuth.loginAsAdmin() : browserAuth.loginAsPrivilegedUser());
  await discover.goto({ queryMode: 'classic' });
  await discover.waitUntilTabIsLoaded();
};

spaceTest.describe('Discover sidebar field groups', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.afterEach(async ({ pageObjects }) => {
    await pageObjects.filterBar.removeAllFilters();
    await pageObjects.unifiedFieldList.cleanSidebarLocalStorage();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('shows available, meta field groups', async ({ browserAuth, pageObjects }) => {
    const { discover, unifiedFieldList } = pageObjects;

    await loginAndOpenDiscover(browserAuth, discover);

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
    async ({ browserAuth, discoverScoutSpace, kbnClient, page, pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await setFieldPopularity(kbnClient, discoverScoutSpace, {
        extension: null,
        '@message': null,
        bytes: null,
      });

      await loginAndOpenDiscover(browserAuth, discover, { asAdmin: true });

      // Each column toggle popularizes the field (indexPatterns.save) and retriggers
      // search. Wait between toggles so saves don't 409 and column state can't race.
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.clickFieldListItemAdd('@message');
      await discover.waitUntilSearchingHasFinished();

      // Count badges use auto-retrying toHaveText; wait for them before reading names.
      await unifiedFieldList.expectSidebarSectionFieldCount('selected', 2);
      expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
        'extension',
        '@message',
      ]);
      await unifiedFieldList.expectSidebarSectionFieldCount('popular', 2);
      await unifiedFieldList.expectAvailableFieldCount(testData.LOGSTASH_AVAILABLE_FIELD_COUNT);

      await unifiedFieldList.clickFieldListItemRemove('@message');
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.clickFieldListItemAdd('@message');
      await discover.waitUntilSearchingHasFinished();

      await unifiedFieldList.expectSidebarSectionFieldCount('selected', 3);
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

      await unifiedFieldList.expectSidebarSectionFieldCount('selected', 3);
      expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
        'extension',
        'bytes',
        '@message',
      ]);
      await unifiedFieldList.expectSidebarSectionFieldCount('popular', 3);
      expect(await unifiedFieldList.getSidebarSectionFieldNames('popular')).toStrictEqual(
        popularBeforeRefresh
      );
    }
  );

  spaceTest(
    'ranks a high-popularity runtime field above other popular fields',
    async ({ apiServices, browserAuth, discoverScoutSpace, kbnClient, pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;
      const runtimeFieldName = '_popularity_runtimefield';

      // Seed the popularity counts the previous test produced via UI toggles through
      // the API instead, so this test stays independent and within the time budget.
      // `clientip` is cleared for retry idempotence: this test popularizes it below.
      await setFieldPopularity(kbnClient, discoverScoutSpace, {
        extension: 1,
        '@message': 3,
        bytes: 1,
        clientip: null,
      });

      await loginAndOpenDiscover(browserAuth, discover, { asAdmin: true });

      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await discover.waitUntilSearchingHasFinished();

      // FTR set popularity: 30 so the new runtime field ranks above selected fields.
      // createRuntimeField already waits for the tab/search to settle.
      await discover.createRuntimeField({
        fieldName: runtimeFieldName,
        script: `emit('test')`,
        popularity: 30,
      });

      try {
        await unifiedFieldList.expectSidebarSectionFieldCount('selected', 1);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'bytes',
        ]);

        await unifiedFieldList.expectSidebarSectionFieldCount('popular', 4);
        const popularAfterRuntimeField = await unifiedFieldList.getSidebarSectionFieldNames(
          'popular'
        );
        expect(popularAfterRuntimeField[0]).toBe(runtimeFieldName);
        expect(popularAfterRuntimeField).toContain('@message');
        expect(popularAfterRuntimeField).toContain('extension');
        expect(popularAfterRuntimeField).toContain('bytes');
        await unifiedFieldList.expectAvailableFieldCount(
          testData.LOGSTASH_AVAILABLE_FIELD_COUNT + 1
        );

        await unifiedFieldList.clickFieldListItemAdd('clientip');
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.expectSidebarSectionFieldCount('popular', 5);
        const popularAfterClientip = await unifiedFieldList.getSidebarSectionFieldNames('popular');
        expect(popularAfterClientip[0]).toBe(runtimeFieldName);
        expect(popularAfterClientip).toContain('clientip');
      } finally {
        // UI delete is flaky here: the field sits in Popular and the delete control is
        // often intercepted by the data grid. Clear it via the data views API instead.
        const dataViewId = discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW);
        const { data: dataView } = await apiServices.dataViews.get(
          dataViewId,
          discoverScoutSpace.id
        );
        const runtimeFieldMap = { ...(dataView.runtimeFieldMap ?? {}) };
        delete runtimeFieldMap[runtimeFieldName];
        await apiServices.dataViews.update(dataViewId, {
          runtimeFieldMap,
          spaceId: discoverScoutSpace.id,
        });
      }
    }
  );

  spaceTest('passes filters down to field stats', async ({ browserAuth, pageObjects }) => {
    const { discover, filterBar, unifiedFieldList } = pageObjects;

    await loginAndOpenDiscover(browserAuth, discover);

    await filterBar.addFilter({ field: 'extension', operator: 'is', value: 'jpg' });
    await discover.waitUntilSearchingHasFinished();

    await unifiedFieldList.clickFieldListItem('extension');
    await unifiedFieldList.waitUntilFieldPopoverIsLoaded();
    // Unfiltered top values are css/png/gif/php — jpg proves the filter applied.
    await expect(unifiedFieldList.getFieldStatsTopValues()).toContainText('jpg');
    await unifiedFieldList.closeFieldPopover();
  });
});
