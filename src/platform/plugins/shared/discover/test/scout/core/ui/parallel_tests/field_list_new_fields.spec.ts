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

// Distinct prefixes so parallel workers don't cross-contaminate each other's
// ES indices when the wildcard data views are searched.
const NEW_FIELDS_INDEX = 'fl-new-fields-001';
const MAPPED_ONLY_INDEX = 'fl-mapped-only-001';

spaceTest.describe(
  'Discover — field list new fields in background handling',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.afterAll(async ({ esClient, discoverScoutSpace }) => {
      await Promise.all([
        esClient.indices.delete({ index: NEW_FIELDS_INDEX, ignore_unavailable: true }),
        esClient.indices.delete({ index: MAPPED_ONLY_INDEX, ignore_unavailable: true }),
      ]);
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'adds newly ingested fields to the available fields section',
      async ({ browserAuth, esClient, pageObjects }) => {
        const { discover, datePicker, unifiedFieldList } = pageObjects;
        const now = new Date().toISOString();

        await esClient.index({
          index: NEW_FIELDS_INDEX,
          document: { '@timestamp': now, a: 'GET /search HTTP/1.1 200 1070000' },
          refresh: true,
        });

        await browserAuth.loginAsPrivilegedUser();
        await discover.goto({ queryMode: 'classic' });
        await discover.waitUntilTabIsLoaded();
        await datePicker.setCommonlyUsedTime('This_week');

        await spaceTest.step('creates ad hoc data view and verifies initial fields', async () => {
          await discover.createDataViewFromSearchBar({ name: 'fl-new-fields-', adHoc: true });
          await unifiedFieldList.waitUntilSidebarHasLoaded();

          expect(await discover.getHitCountInt()).toBe(1);
          expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).toStrictEqual([
            '@timestamp',
            'a',
          ]);
        });

        await spaceTest.step('detects new field after indexing a document with it', async () => {
          await esClient.index({
            index: NEW_FIELDS_INDEX,
            document: { '@timestamp': now, b: 'GET /search HTTP/1.1 200 1070000' },
            refresh: true,
          });

          await expect
            .poll(
              async () => {
                await discover.submitQuery();
                await discover.waitUntilSearchingHasFinished();
                await unifiedFieldList.waitUntilSidebarHasLoaded();
                return (
                  (await discover.getHitCountInt()) === 2 &&
                  (await unifiedFieldList.getAvailableFieldCount()) === 3
                );
              },
              { timeout: 30_000, intervals: [1_000] }
            )
            .toBe(true);

          expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).toStrictEqual([
            '@timestamp',
            'a',
            'b',
          ]);
        });
      }
    );

    spaceTest(
      'does not show mapped fields that have no values',
      async ({ browserAuth, esClient, pageObjects }) => {
        const { discover, datePicker, unifiedFieldList } = pageObjects;
        const now = new Date().toISOString();

        await esClient.index({
          index: MAPPED_ONLY_INDEX,
          document: { '@timestamp': now, a: 'GET /search HTTP/1.1 200 1070000' },
          refresh: true,
        });

        await browserAuth.loginAsPrivilegedUser();
        await discover.goto({ queryMode: 'classic' });
        await discover.waitUntilTabIsLoaded();
        await datePicker.setCommonlyUsedTime('This_week');

        await spaceTest.step('creates ad hoc data view and verifies initial fields', async () => {
          await discover.createDataViewFromSearchBar({ name: MAPPED_ONLY_INDEX, adHoc: true });
          await unifiedFieldList.waitUntilSidebarHasLoaded();

          expect(await discover.getHitCountInt()).toBe(1);
          expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).toStrictEqual([
            '@timestamp',
            'a',
          ]);
        });

        await spaceTest.step(
          'does not show a mapped field that has no values after re-query',
          async () => {
            await esClient.indices.putMapping({
              index: MAPPED_ONLY_INDEX,
              properties: { b: { type: 'keyword' } },
            });

            await esClient.index({
              index: MAPPED_ONLY_INDEX,
              document: { '@timestamp': now, a: 'GET /search HTTP/1.1 200 1070000' },
              refresh: true,
            });

            await expect
              .poll(
                async () => {
                  await discover.submitQuery();
                  await discover.waitUntilSearchingHasFinished();
                  await unifiedFieldList.waitUntilSidebarHasLoaded();
                  return (await discover.getHitCountInt()) === 2;
                },
                { timeout: 30_000, intervals: [1_000] }
              )
              .toBe(true);

            expect(await unifiedFieldList.getSidebarSectionFieldNames('available')).toStrictEqual([
              '@timestamp',
              'a',
            ]);
          }
        );
      }
    );
  }
);
