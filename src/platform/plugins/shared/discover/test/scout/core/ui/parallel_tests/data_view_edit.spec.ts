/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

// Distinct prefix from the data view creation spec: both run in parallel against the same
// cluster, so sharing index names would let one spec's teardown delete the other's data.
const STARTER_INDEX = 'data-view-edit-000001';
const TARGET_INDEX = 'data-view-edit-000003';
const STARTER_DATA_VIEW_ID = 'data-view-edit-starter';

spaceTest.describe('Discover — data view flyout', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ esClient, apiServices, discoverScoutSpace }) => {
    const now = new Date().toISOString();

    await esClient.bulk({
      refresh: 'wait_for',
      operations: [
        { index: { _index: STARTER_INDEX } },
        { '@timestamp': now, a: 'GET /search HTTP/1.1 200 1070000' },
        // The 1970 document stays outside the "This week" range, so editing the data view to
        // this index yields 3 hits while the time field is set and 4 once it is removed.
        { index: { _index: TARGET_INDEX } },
        {
          timestamp: new Date('1970-01-01').toISOString(),
          c: 'GET /search HTTP/1.1 200 1070000',
          d: 'GET /search HTTP/1.1 200 1070000',
        },
        { index: { _index: TARGET_INDEX } },
        {
          timestamp: now,
          c: 'GET /search HTTP/1.1 200 1070000',
          d: 'GET /search HTTP/1.1 200 1070000',
        },
        { index: { _index: TARGET_INDEX } },
        {
          timestamp: now,
          c: 'GET /search HTTP/1.1 200 1070000',
          d: 'GET /search HTTP/1.1 200 1070000',
        },
        { index: { _index: TARGET_INDEX } },
        {
          timestamp: now,
          c: 'GET /search HTTP/1.1 200 1070000',
          d: 'GET /search HTTP/1.1 200 1070000',
        },
      ],
    });

    await apiServices.dataViews.create({
      id: STARTER_DATA_VIEW_ID,
      title: STARTER_INDEX,
      timeFieldName: '@timestamp',
      override: true,
      spaceId: discoverScoutSpace.id,
    });
    await discoverScoutSpace.uiSettings.set({ defaultIndex: STARTER_DATA_VIEW_ID });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    const { discover, datePicker } = pageObjects;
    await browserAuth.loginAsPrivilegedUser();
    await discover.goto({ queryMode: 'classic' });
    await discover.waitUntilTabIsLoaded();
    await datePicker.setCommonlyUsedTime('This_week');
    await discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ esClient, discoverScoutSpace }) => {
    await Promise.all([
      esClient.indices.delete({ index: STARTER_INDEX, ignore_unavailable: true }),
      esClient.indices.delete({ index: TARGET_INDEX, ignore_unavailable: true }),
    ]);
    await discoverScoutSpace.uiSettings.unset('defaultIndex');
  });

  spaceTest(
    'edits data view index pattern and time field from search bar',
    async ({ page, pageObjects }) => {
      const { discover, datePicker, unifiedFieldList } = pageObjects;

      await spaceTest.step(
        'edits data view to use a different index pattern and time field',
        async () => {
          await discover.editDataViewFromSearchBar({
            newIndexPattern: TARGET_INDEX,
            newTimeField: 'timestamp',
          });
          await unifiedFieldList.waitUntilSidebarHasLoaded();
          await discover.waitUntilSearchingHasFinished();

          expect(await discover.getHitCountInt()).toBe(3);
          expect(await unifiedFieldList.getAvailableFieldCount()).toBe(3);
          await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();
          expect(await datePicker.timePickerExists()).toBe(true);
        }
      );

      await spaceTest.step('edits data view to remove the time field', async () => {
        await discover.editDataViewFromSearchBar({
          newTimeField: "--- I don't want to use the time filter ---",
        });
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await discover.waitUntilSearchingHasFinished();

        expect(await discover.getHitCountInt()).toBe(4);
        expect(await unifiedFieldList.getAvailableFieldCount()).toBe(3);
        await expect(page.testSubj.locator('unifiedHistogramChart')).toBeHidden();
        expect(await datePicker.timePickerExists()).toBe(false);
      });
    }
  );
});
