/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const FIELDS_FOR_WILDCARD_ENDPOINT = '/internal/data_views/_fields_for_wildcard';

const countMatchingRequests = async (
  page: ScoutPage,
  endpoint: string,
  action: () => Promise<void>
): Promise<number> => {
  let count = 0;
  const listener = (request: { url: () => string }) => {
    if (request.url().includes(endpoint)) {
      count++;
    }
  };

  page.on('request', listener);
  try {
    await action();
  } finally {
    page.off('request', listener);
  }

  return count;
};

const expectAvailableFieldCount = async (page: ScoutPage, count: number) => {
  await expect(page.testSubj.locator('fieldListGroupedAvailableFields-count')).toHaveText(
    count.toString()
  );
};

const expectUnfilteredAvailableFieldCount = async (
  { unifiedFieldList }: PageObjects,
  page: ScoutPage,
  count: number
) => {
  await unifiedFieldList.searchField('');
  await expectAvailableFieldCount(page, count);
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
        const { discover, unifiedTabs } = pageObjects;

        await browserAuth.loginAsViewer();
        await discover.goto({ queryMode: 'classic' });
        await discover.waitUntilTabIsLoaded();
        await expectAvailableFieldCount(page, 48);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.createNewTab();
            await discover.waitUntilTabIsLoaded();
            await expectAvailableFieldCount(page, 48);
          })
        ).toBe(1);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.selectTab(0);
            await discover.waitUntilTabIsLoaded();
            await expectAvailableFieldCount(page, 48);
          })
        ).toBe(0);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.selectTab(1);
            await discover.waitUntilTabIsLoaded();
            await expectAvailableFieldCount(page, 48);
          })
        ).toBe(0);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.createNewTab();
            await discover.waitUntilTabIsLoaded();
            await expectAvailableFieldCount(page, 48);
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
        await expectAvailableFieldCount(page, 48);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.createNewTab();
            await discover.waitUntilTabIsLoaded();
            await expectAvailableFieldCount(page, 48);
          })
        ).toBe(1);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await discover.createRuntimeField(field, `emit('test')`);
            await expectAvailableFieldCount(page, 49);
            await unifiedFieldList.searchField(field);
            await unifiedFieldList.getAvailableField(field).waitFor({ state: 'visible' });
          })
        ).toBe(1);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.selectTab(0);
            await discover.waitUntilTabIsLoaded();
            await expectUnfilteredAvailableFieldCount(pageObjects, page, 49);
            await unifiedFieldList.searchField(field);
            await unifiedFieldList.getAvailableField(field).waitFor({ state: 'visible' });
          })
        ).toBe(1);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedTabs.selectTab(1);
            await discover.waitUntilTabIsLoaded();
            await expectUnfilteredAvailableFieldCount(pageObjects, page, 49);
            await unifiedFieldList.searchField(field);
            await unifiedFieldList.getAvailableField(field).waitFor({ state: 'visible' });
          })
        ).toBe(0);

        expect(
          await countMatchingRequests(page, FIELDS_FOR_WILDCARD_ENDPOINT, async () => {
            await unifiedFieldList.openFieldEditor(field);
            await discover.renameRuntimeField(field2);
            await expectUnfilteredAvailableFieldCount(pageObjects, page, 49);
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
            await expectUnfilteredAvailableFieldCount(pageObjects, page, 49);
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
