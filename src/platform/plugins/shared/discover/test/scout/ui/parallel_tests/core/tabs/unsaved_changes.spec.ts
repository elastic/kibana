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
import { spaceTest } from '../../../fixtures/common';

const QUERY_IOS = 'machine.os: "ios"';
const QUERY_WINDOWS = 'machine.os: "win"';

const createSessionName = (prefix: string) => `${prefix}-${Date.now()}`;

const saveSession = async (pageObjects: PageObjects, sessionName: string) => {
  await pageObjects.discover.saveSearch(sessionName);
  await pageObjects.discover.waitUntilTabIsLoaded();
};

spaceTest.describe('Discover tabs - unsaved changes', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('shows unsaved changes after altering state post-save', async ({ pageObjects }) => {
    const { discover, unifiedTabs } = pageObjects;

    await saveSession(pageObjects, createSessionName('unsaved-changes-query'));
    await expect(await unifiedTabs.getTabUnsavedIndicator(0)).toBeHidden();

    await discover.writeAndSubmitKqlQuery(QUERY_IOS);

    await expect(await unifiedTabs.getTabUnsavedIndicator(0)).toBeVisible();
    await expect(discover.unsavedChangesIndicator()).toBeVisible();
  });

  spaceTest(
    'persists modified tab indicators across refresh and clears on save',
    async ({ page, pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;
      const sessionName = createSessionName('unsaved-changes-refresh');

      await spaceTest.step('modify two saved tabs', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await saveSession(pageObjects, sessionName);
        await expect(await unifiedTabs.getTabUnsavedIndicator(2)).toBeHidden();

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitKqlQuery(QUERY_IOS);
        await expect(await unifiedTabs.getTabUnsavedIndicator(0)).toBeVisible();
        await expect(discover.unsavedChangesIndicator()).toBeVisible();

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitKqlQuery(QUERY_WINDOWS);
        await expect(await unifiedTabs.getTabUnsavedIndicator(1)).toBeVisible();
        await expect(await unifiedTabs.getTabUnsavedIndicator(2)).toBeHidden();
      });

      await spaceTest.step('persist indicators across refresh', async () => {
        await page.reload();
        await discover.waitUntilTabIsLoaded();

        await expect(await unifiedTabs.getTabUnsavedIndicator(0)).toBeVisible();
        await expect(await unifiedTabs.getTabUnsavedIndicator(1)).toBeVisible();
        await expect(await unifiedTabs.getTabUnsavedIndicator(2)).toBeHidden();
        await expect(discover.unsavedChangesIndicator()).toBeVisible();
      });

      await spaceTest.step('clear indicators after saving', async () => {
        await saveSession(pageObjects, sessionName);
        await expect(await unifiedTabs.getTabUnsavedIndicator(0)).toBeHidden();
        await expect(await unifiedTabs.getTabUnsavedIndicator(1)).toBeHidden();
        await expect(discover.unsavedChangesIndicator()).toBeHidden();
      });
    }
  );

  spaceTest(
    'refetches a modified tab when switching back after reverting changes',
    async ({ pageObjects }) => {
      const { discover, unifiedTabs } = pageObjects;
      const originalHitCount = await discover.getHitCountInt();

      await spaceTest.step('modify a saved tab and revert from another tab', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await expect(await unifiedTabs.getTabUnsavedIndicator(1)).toBeHidden();
        await saveSession(pageObjects, createSessionName('unsaved-changes-refetch'));

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitKqlQuery(QUERY_IOS);
        await expect(await unifiedTabs.getTabUnsavedIndicator(0)).toBeVisible();
        await expect(discover.unsavedChangesIndicator()).toBeVisible();
        expect(await discover.getHitCountInt()).not.toBe(originalHitCount);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        await discover.revertUnsavedChanges();
        await expect(await unifiedTabs.getTabUnsavedIndicator(0)).toBeHidden();
        await expect(discover.unsavedChangesIndicator()).toBeHidden();
      });

      await spaceTest.step('refetch restored tab state after switching back', async () => {
        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCountInt()).toBe(originalHitCount);
      });
    }
  );
});
