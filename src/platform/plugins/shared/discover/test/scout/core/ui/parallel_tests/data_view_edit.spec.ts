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

const INDEX_000001 = 'data-view-index-000001';
const INDEX_000002 = 'data-view-index-000002';
const INDEX_000003 = 'data-view-index-000003';
const STARTER_DATA_VIEW_ID = 'data-view-edit-starter';

spaceTest.describe('Discover — data view flyout', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ esClient, apiServices, discoverScoutSpace }) => {
    const now = new Date().toISOString();

    await esClient.bulk({
      operations: [
        { index: { _index: INDEX_000001 } },
        { '@timestamp': now, a: 'GET /search HTTP/1.1 200 1070000' },
        { index: { _index: INDEX_000002 } },
        { '@timestamp': now, b: 'GET /search HTTP/1.1 200 1070000' },
        { index: { _index: INDEX_000003 } },
        {
          timestamp: new Date('1970-01-01').toISOString(),
          c: 'GET /search HTTP/1.1 200 1070000',
          d: 'GET /search HTTP/1.1 200 1070000',
        },
        { index: { _index: INDEX_000003 } },
        {
          timestamp: now,
          c: 'GET /search HTTP/1.1 200 1070000',
          d: 'GET /search HTTP/1.1 200 1070000',
        },
        { index: { _index: INDEX_000003 } },
        {
          timestamp: now,
          c: 'GET /search HTTP/1.1 200 1070000',
          d: 'GET /search HTTP/1.1 200 1070000',
        },
        { index: { _index: INDEX_000003 } },
        {
          timestamp: now,
          c: 'GET /search HTTP/1.1 200 1070000',
          d: 'GET /search HTTP/1.1 200 1070000',
        },
      ],
    });

    await apiServices.dataViews.create({
      id: STARTER_DATA_VIEW_ID,
      title: INDEX_000001,
      timeFieldName: '@timestamp',
      override: true,
      spaceId: discoverScoutSpace.id,
    });
    await discoverScoutSpace.uiSettings.set({ defaultIndex: STARTER_DATA_VIEW_ID });
  });

  spaceTest.afterAll(async ({ esClient, discoverScoutSpace }) => {
    await Promise.all([
      esClient.indices.delete({ index: INDEX_000001, ignore_unavailable: true }),
      esClient.indices.delete({ index: INDEX_000002, ignore_unavailable: true }),
      esClient.indices.delete({ index: INDEX_000003, ignore_unavailable: true }),
    ]);
    await discoverScoutSpace.uiSettings.unset('defaultIndex');
  });

  spaceTest(
    'creates ad hoc and saved data views from the search bar',
    async ({ browserAuth, pageObjects }) => {
      const { discover, datePicker, unifiedFieldList } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();
      await datePicker.setCommonlyUsedTime('This_week');
      await discover.waitUntilSearchingHasFinished();

      await spaceTest.step('creates an ad hoc data view', async () => {
        await discover.createDataViewFromSearchBar({ name: 'data-view-index-', adHoc: true });
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        expect(await discover.getHitCountInt()).toBe(2);
        expect(await unifiedFieldList.getAvailableFieldCount()).toBe(3);
      });

      await spaceTest.step('creates a saved data view', async () => {
        await discover.createDataViewFromSearchBar({ name: INDEX_000001, adHoc: false });
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await expect.poll(() => discover.getHitCountInt()).toBe(1);
        expect(await unifiedFieldList.getAvailableFieldCount()).toBe(2);
      });
    }
  );

  spaceTest(
    'edits data view index pattern and time field from search bar',
    async ({ browserAuth, page, pageObjects }) => {
      const { discover, datePicker, unifiedFieldList } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();
      await datePicker.setCommonlyUsedTime('This_week');
      await discover.waitUntilSearchingHasFinished();

      await spaceTest.step(
        'edits data view to use a different index pattern and time field',
        async () => {
          await discover.editDataViewFromSearchBar({
            newIndexPattern: INDEX_000003,
            newTimeField: 'timestamp',
          });
          await unifiedFieldList.waitUntilSidebarHasLoaded();

          await expect.poll(() => discover.getHitCountInt()).toBe(3);
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

        await expect.poll(() => discover.getHitCountInt()).toBe(4);
        expect(await unifiedFieldList.getAvailableFieldCount()).toBe(3);
        await expect(page.testSubj.locator('unifiedHistogramChart')).toBeHidden();
        expect(await datePicker.timePickerExists()).toBe(false);
      });
    }
  );
});
