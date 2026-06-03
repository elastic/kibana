/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import { DISCOVER_LOGSTASH_ALL_ROLE } from '../../fixtures/common/custom_roles';

const openInspectorFromTabMenu = async (page: ScoutPage) => {
  if (await page.testSubj.locator('inspectorPanel').isVisible()) {
    return;
  }

  const selectedTab = page
    .locator('[data-test-subj^="unifiedTabs_tab_"]')
    .filter({ has: page.locator('[role="tab"][aria-selected="true"]') });

  await selectedTab.locator('[data-test-subj^="unifiedTabs_tabMenuBtn_"]').dispatchEvent('click');

  const menuItem = page.testSubj.locator('unifiedTabs_tabMenuItem_inspect');
  await menuItem.waitFor({ state: 'visible' });
  await menuItem.dispatchEvent('click');
  await page.testSubj.locator('inspectorPanel').waitFor({ state: 'visible' });
};

const getInspectorTableData = async (page: ScoutPage): Promise<string[][]> =>
  page
    .locator('[data-test-subj="inspectorPanel"] tbody tr')
    .evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? '')
      )
    );

const getHitCount = (requestStats: string[][]): string | undefined =>
  requestStats.find(([name]) => name === 'Hits')?.[1];

spaceTest.describe('Discover inspector', { tag: testData.DISCOVER_STATEFUL_TAGS }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(
      'src/platform/test/functional/fixtures/kbn_archiver/discover.json'
    );
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginWithCustomRole(DISCOVER_LOGSTASH_ALL_ROLE);
    await pageObjects.discover.setQueryMode('classic');
    await page.gotoApp('discover');
    await page.testSubj.locator('dscPage').waitFor({ state: 'visible', timeout: 60_000 });
  });

  spaceTest.afterEach(async ({ pageObjects }) => {
    if (await pageObjects.inspector.panel.isVisible()) {
      await pageObjects.inspector.close();
    }
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('displays request stats with zero hits', async ({ page, pageObjects }) => {
    // Set a time range that yields no documents in the logstash-* index.
    await pageObjects.datePicker.setAbsoluteRange({
      from: 'Jan 1, 1999 @ 00:00:00.000',
      to: 'Jan 1, 1999 @ 00:00:01.000',
    });
    await pageObjects.discover.waitUntilSearchingHasFinished();

    await openInspectorFromTabMenu(page);
    await page.testSubj.locator('inspectorRequestDetailStatistics').waitFor({ state: 'visible' });
    await page.testSubj.click('inspectorRequestDetailStatistics');

    expect(getHitCount(await getInspectorTableData(page))).toBe('0');
  });

  spaceTest('displays request stats with results', async ({ page }) => {
    await openInspectorFromTabMenu(page);
    await page.testSubj.locator('inspectorRequestDetailStatistics').waitFor({ state: 'visible' });
    await page.testSubj.click('inspectorRequestDetailStatistics');

    expect(getHitCount(await getInspectorTableData(page))).toBe('500');
  });
});
