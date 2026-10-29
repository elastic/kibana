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
const NEW_FIELDS_INDEX = 'fl-new-fields-001';

spaceTest.describe(
  'Discover — field list new fields in background handling',
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
      await esClient.indices.delete({ index: NEW_FIELDS_INDEX, ignore_unavailable: true });
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'adds newly ingested fields to the available fields section',
      async ({ esClient, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;
        const now = new Date().toISOString();

        await esClient.index({
          index: NEW_FIELDS_INDEX,
          document: { '@timestamp': now, a: 'GET /search HTTP/1.1 200 1070000' },
          refresh: true,
        });

        await discover.createDataViewFromSearchBar({ name: 'fl-new-fields-', adHoc: true });
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        expect(await discover.getHitCountInt()).toBe(1);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).toStrictEqual([
          '@timestamp',
          'a',
        ]);
      }
    );

    spaceTest(
      'detects new field after indexing a document with it',
      async ({ esClient, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;
        const now = new Date().toISOString();

        await esClient.indices.delete({ index: NEW_FIELDS_INDEX, ignore_unavailable: true });
        await esClient.index({
          index: NEW_FIELDS_INDEX,
          document: { '@timestamp': now, a: 'GET /search HTTP/1.1 200 1070000' },
          refresh: true,
        });

        await discover.createDataViewFromSearchBar({ name: 'fl-new-fields-', adHoc: true });
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await esClient.index({
          index: NEW_FIELDS_INDEX,
          document: { '@timestamp': now, b: 'GET /search HTTP/1.1 200 1070000' },
          refresh: true,
        });

        await discover.submitQuery();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        expect(await discover.getHitCountInt()).toBe(2);
        // The document is already visible on this fetch, but the sidebar lists its new field a
        // moment later. Waiting on the field itself is enough; re-running the query is not what
        // makes it appear.
        await expect(unifiedFieldList.getAvailableField('b')).toBeVisible();

        expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).toStrictEqual([
          '@timestamp',
          'a',
          'b',
        ]);
      }
    );
  }
);
