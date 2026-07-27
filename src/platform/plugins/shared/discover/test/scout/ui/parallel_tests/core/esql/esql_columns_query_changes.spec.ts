/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Verifies how Discover's data-grid columns react to ES|QL query edits: columns
 * reset only when the resolved index pattern changes (this covers the UI wiring;
 * the underlying reset logic is unit-tested in
 * `public/application/main/state_management/utils/build_esql_fetch_subscribe.test.ts`),
 * recovery from a query error, and correct fields when the initial query returns
 * no results.
 *
 * Migrated from `src/platform/test/functional/apps/discover/esql_1/_esql_columns.ts`
 * (`changing the query` group).
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../fixtures/common';

spaceTest.describe(
  'Discover ES|QL columns - changing the query',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('resets columns only for certain query changes', async ({ pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 500');
      expect(await discover.getDocHeader()).toStrictEqual(['@timestamp', 'Summary']);

      await spaceTest.step('adding a field replaces the Summary column', async () => {
        await unifiedFieldList.clickFieldListItemAdd('bytes');
        await discover.waitUntilSearchingHasFinished();
        expect(await discover.getDocHeader()).toStrictEqual(['@timestamp', 'bytes']);
      });

      await spaceTest.step('same index pattern keeps the selected columns', async () => {
        await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 500 | where bytes > 0');
        expect(await discover.getDocHeader()).toStrictEqual(['@timestamp', 'bytes']);
      });

      await spaceTest.step('different index pattern resets the columns', async () => {
        await discover.writeAndSubmitEsqlQuery('from logs* | limit 500');
        expect(await discover.getDocHeader()).toStrictEqual(['@timestamp', 'Summary']);
      });
    });

    spaceTest(
      'recovers from an error and resets columns correctly for a transformational query',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.writeAndSubmitEsqlQuery('from not_an_index');
        await expect(discover.getErrorCalloutMessage()).toBeVisible();

        await spaceTest.step('the error persists across a page reload', async () => {
          await page.reload();
          await expect(discover.getErrorCalloutMessage()).toBeVisible();
        });

        await spaceTest.step(
          'a valid transformational query recovers and sets columns',
          async () => {
            await discover.writeAndSubmitEsqlQuery(
              'from logstash-* | keep ip, @timestamp, bytes | limit 10'
            );
            expect(await discover.getDocHeader()).toStrictEqual(['ip', '@timestamp', 'bytes']);
          }
        );
      }
    );

    spaceTest(
      'sets fields correctly when the initial query returns no results',
      async ({ page, pageObjects }) => {
        const { discover, datePicker } = pageObjects;

        await discover.writeAndSubmitEsqlQuery('from logstash-* | keep ip, @timestamp | limit 500');

        await spaceTest.step('an out-of-range time filter yields no columns', async () => {
          await datePicker.setCommonlyUsedTime('Last_1 hour');
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getDocHeader()).toStrictEqual([]);
        });

        await spaceTest.step('restoring the time range repopulates the columns', async () => {
          await page.reload();
          await discover.waitUntilTabIsLoaded();
          await datePicker.setAbsoluteRange(testData.DEFAULT_TIME_RANGE_DISPLAY);
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getDocHeader()).toStrictEqual(['ip', '@timestamp']);
        });
      }
    );
  }
);
