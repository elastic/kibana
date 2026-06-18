/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Legacy saved-search save/load flows.
 *
 * Validates that legacy (pre-tabs) saved searches load into a single untitled
 * tab and can be extended with additional tabs and re-saved.
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import { saveDiscoverSession, getHitCount } from '../../fixtures/tabs/helpers';

const LEGACY_SESSION_NAME = 'A Saved Search';
const UPDATED_SESSION_NAME = 'Updated legacy session';

test.describe('tabs - legacy Discover sessions', { tag: tags.stateful.all }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await kbnClient.importExport.load(testData.DISCOVER_KBN_ARCHIVE);
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
    );
    await kbnClient.uiSettings.update({
      defaultIndex: testData.DEFAULT_DATA_VIEW,
      'timepicker:timeDefaults': JSON.stringify({
        from: testData.DEFAULT_TIME_RANGE.from,
        to: testData.DEFAULT_TIME_RANGE.to,
      }),
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('defaultIndex');
    await kbnClient.uiSettings.unset('timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should load a legacy Discover session into a single untitled tab', async ({
    pageObjects,
    page,
  }) => {
    const { discover } = pageObjects;

    await discover.loadSavedSearch(LEGACY_SESSION_NAME);
    await discover.waitUntilSearchingHasFinished();

    await expect(page.testSubj.locator('breadcrumb last')).toHaveText(LEGACY_SESSION_NAME);
    expect(await discover.getTabLabels()).toStrictEqual(['Untitled']);
    expect(await getHitCount(page)).toBe('14,004');
  });

  test('should allow adding tabs to a legacy session and saving as new', async ({
    pageObjects,
    page,
  }) => {
    const { discover } = pageObjects;

    await test.step('load legacy session', async () => {
      await discover.loadSavedSearch(LEGACY_SESSION_NAME);
      await discover.waitUntilSearchingHasFinished();
      await expect(page.testSubj.locator('breadcrumb last')).toHaveText(LEGACY_SESSION_NAME);
      expect(await discover.getTabLabels()).toStrictEqual(['Untitled']);
    });

    await test.step('create a second tab', async () => {
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);
    });

    await test.step('save as new session', async () => {
      await saveDiscoverSession(page, UPDATED_SESSION_NAME, { saveAsNew: true });
      await expect(page.testSubj.locator('breadcrumb last')).toHaveText(UPDATED_SESSION_NAME);
      expect(await discover.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);
    });

    await test.step('load legacy session again', async () => {
      await discover.loadSavedSearch(LEGACY_SESSION_NAME);
      await discover.waitUntilSearchingHasFinished();
      await expect(page.testSubj.locator('breadcrumb last')).toHaveText(LEGACY_SESSION_NAME);
      expect(await discover.getTabLabels()).toStrictEqual(['Untitled']);
    });

    await test.step('load updated session again', async () => {
      await discover.loadSavedSearch(UPDATED_SESSION_NAME);
      await discover.waitUntilSearchingHasFinished();
      await expect(page.testSubj.locator('breadcrumb last')).toHaveText(UPDATED_SESSION_NAME);
      expect(await discover.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);
    });
  });
});
