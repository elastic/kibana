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

const INDEX_000001 = 'data-view-create-000001';
const INDEX_000002 = 'data-view-create-000002';
const INDEX_000003 = 'data-view-create-000003';
const STARTER_DATA_VIEW_ID = 'data-view-create-starter';

spaceTest.describe('Discover — data view creation', { tag: '@local-stateful-classic' }, () => {
  // All three indices are required: the ad hoc test creates a `data-view-create-*` wildcard, and
  // its expected hit count of 2 is what proves INDEX_000003's `timestamp`-only documents are
  // excluded by the time filter. Without them the assertion would pass for the wrong reason.
  spaceTest.beforeAll(async ({ esClient, apiServices, discoverScoutSpace }) => {
    const now = new Date().toISOString();

    await esClient.bulk({
      refresh: 'wait_for',
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
      esClient.indices.delete({ index: INDEX_000001, ignore_unavailable: true }),
      esClient.indices.delete({ index: INDEX_000002, ignore_unavailable: true }),
      esClient.indices.delete({ index: INDEX_000003, ignore_unavailable: true }),
    ]);
    await discoverScoutSpace.uiSettings.unset('defaultIndex');
  });

  spaceTest('creates an ad hoc data view from the search bar', async ({ pageObjects }) => {
    const { discover, unifiedFieldList } = pageObjects;

    await discover.createDataViewFromSearchBar({ name: 'data-view-create-', adHoc: true });
    await unifiedFieldList.waitUntilSidebarHasLoaded();

    expect(await discover.getHitCountInt()).toBe(2);
    expect(await unifiedFieldList.getAvailableFieldCount()).toBe(3);
  });

  spaceTest('creates a saved data view from the search bar', async ({ pageObjects }) => {
    const { discover, unifiedFieldList } = pageObjects;

    await discover.createDataViewFromSearchBar({ name: INDEX_000001, adHoc: false });
    await unifiedFieldList.waitUntilSidebarHasLoaded();
    await discover.waitUntilSearchingHasFinished();

    expect(await discover.getHitCountInt()).toBe(1);
    expect(await unifiedFieldList.getAvailableFieldCount()).toBe(2);
  });
});
