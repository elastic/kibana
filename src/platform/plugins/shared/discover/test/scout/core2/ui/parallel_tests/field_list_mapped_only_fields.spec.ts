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

// Distinct prefix so parallel workers don't cross-contaminate each other's
// ES indices when the wildcard data views are searched.
const MAPPED_ONLY_INDEX = 'fl-mapped-only-001';

spaceTest.describe(
  'Discover — field list mapped fields without values',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      const { discover, datePicker } = pageObjects;
      await browserAuth.loginAsPrivilegedUser();
      await discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();
      await datePicker.setCommonlyUsedTime('This_week');
    });

    spaceTest.afterAll(async ({ esClient, discoverScoutSpace }) => {
      await esClient.indices.delete({ index: MAPPED_ONLY_INDEX, ignore_unavailable: true });
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'does not show mapped fields that have no values',
      async ({ esClient, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;
        const now = new Date().toISOString();

        await esClient.index({
          index: MAPPED_ONLY_INDEX,
          document: { '@timestamp': now, a: 'GET /search HTTP/1.1 200 1070000' },
          refresh: true,
        });

        await discover.createDataViewFromSearchBar({ name: MAPPED_ONLY_INDEX, adHoc: true });
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        expect(await discover.getHitCountInt()).toBe(1);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).toStrictEqual([
          '@timestamp',
          'a',
        ]);
      }
    );

    spaceTest(
      'does not show a mapped field that has no values after re-query',
      async ({ esClient, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;
        const now = new Date().toISOString();

        await esClient.indices.delete({ index: MAPPED_ONLY_INDEX, ignore_unavailable: true });
        await esClient.index({
          index: MAPPED_ONLY_INDEX,
          document: { '@timestamp': now, a: 'GET /search HTTP/1.1 200 1070000' },
          refresh: true,
        });

        await discover.createDataViewFromSearchBar({ name: MAPPED_ONLY_INDEX, adHoc: true });
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await esClient.indices.putMapping({
          index: MAPPED_ONLY_INDEX,
          properties: { b: { type: 'keyword' } },
        });

        await esClient.index({
          index: MAPPED_ONLY_INDEX,
          document: { '@timestamp': now, a: 'GET /search HTTP/1.1 200 1070000' },
          refresh: true,
        });

        await discover.submitQuery();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        // Waiting for the second document keeps the field assertion below meaningful: the
        // sidebar has already refreshed for this fetch, so `b` is absent because it has no
        // values, not because the list has yet to catch up.
        expect(await discover.getHitCountInt()).toBe(2);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).toStrictEqual([
          '@timestamp',
          'a',
        ]);
      }
    );
  }
);
