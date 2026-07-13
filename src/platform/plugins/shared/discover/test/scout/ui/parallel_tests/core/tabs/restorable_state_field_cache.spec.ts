/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { countMatchingRequests, spaceTest } from '../../../fixtures/common';

const FIELDS_FOR_WILDCARD_ENDPOINT = '/internal/data_views/_fields_for_wildcard';

const expectUnfilteredAvailableFieldCount = async (
  { unifiedFieldList }: PageObjects,
  count: number
): Promise<void> => {
  await unifiedFieldList.searchField('');
  await unifiedFieldList.expectAvailableFieldCount(count);
};

spaceTest.describe(
  'Discover tabs - restorable existing field cache',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeEach(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.afterEach(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'does not fetch existing fields again when returning to a tab',
      async ({ browserAuth, page, pageObjects }) => {
        const { discover, unifiedFieldList, unifiedTabs } = pageObjects;

        await browserAuth.loginAsViewer();
        await discover.goto({ queryMode: 'classic' });
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.expectAvailableFieldCount(48);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.createNewTab();
            await discover.waitUntilTabIsLoaded();
            await unifiedFieldList.expectAvailableFieldCount(48);
          })
        ).toBe(1);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.selectTab(0);
            await discover.waitUntilTabIsLoaded();
            await unifiedFieldList.expectAvailableFieldCount(48);
          })
        ).toBe(0);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.selectTab(1);
            await discover.waitUntilTabIsLoaded();
            await unifiedFieldList.expectAvailableFieldCount(48);
          })
        ).toBe(0);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.createNewTab();
            await discover.waitUntilTabIsLoaded();
            await unifiedFieldList.expectAvailableFieldCount(48);
          })
        ).toBe(1);
      }
    );

    spaceTest(
      'refetches existing fields when returning to an edited data view',
      async ({ browserAuth, page, pageObjects }) => {
        const { discover, unifiedFieldList, unifiedTabs } = pageObjects;
        const field = '_test';
        const field2 = '_test2';

        await browserAuth.loginAsPrivilegedUser();
        await discover.goto({ queryMode: 'classic' });
        await discover.waitUntilTabIsLoaded();
        await unifiedFieldList.expectAvailableFieldCount(48);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.createNewTab();
            await discover.waitUntilTabIsLoaded();
            await unifiedFieldList.expectAvailableFieldCount(48);
          })
        ).toBe(1);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await discover.createRuntimeField(field, `emit('test')`);
            await unifiedFieldList.expectAvailableFieldCount(49);
            await unifiedFieldList.searchField(field);
            await unifiedFieldList.getAvailableField(field).waitFor({ state: 'visible' });
          })
        ).toBe(1);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.selectTab(0);
            await discover.waitUntilTabIsLoaded();
            await expectUnfilteredAvailableFieldCount(pageObjects, 49);
            await unifiedFieldList.searchField(field);
            await unifiedFieldList.getAvailableField(field).waitFor({ state: 'visible' });
          })
        ).toBe(1);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.selectTab(1);
            await discover.waitUntilTabIsLoaded();
            await expectUnfilteredAvailableFieldCount(pageObjects, 49);
            await unifiedFieldList.searchField(field);
            await unifiedFieldList.getAvailableField(field).waitFor({ state: 'visible' });
          })
        ).toBe(0);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedFieldList.openFieldEditor(field);
            await discover.renameRuntimeField(field2);
            await expectUnfilteredAvailableFieldCount(pageObjects, 49);
            await unifiedFieldList.searchField(field);
            await unifiedFieldList.getAvailableField(field).waitFor({ state: 'hidden' });
            await unifiedFieldList.searchField(field2);
            await unifiedFieldList.getAvailableField(field2).waitFor({ state: 'visible' });
          })
        ).toBe(1);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.selectTab(0);
            await discover.waitUntilTabIsLoaded();
            await expectUnfilteredAvailableFieldCount(pageObjects, 49);
            await unifiedFieldList.searchField(field);
            await unifiedFieldList.getAvailableField(field).waitFor({ state: 'hidden' });
            await unifiedFieldList.searchField(field2);
            await unifiedFieldList.getAvailableField(field2).waitFor({ state: 'visible' });
          })
        ).toBe(1);
      }
    );
  }
);
