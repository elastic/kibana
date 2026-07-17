/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL query history panel: current and updated queries are recorded,
 * history items can be re-run, and failed queries are flagged.
 */

import { tags, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures';
import { testData } from '../../../fixtures/common';

const openQueryHistory = async (page: ScoutPage) => {
  await page.testSubj.click('ESQLEditor-toggle-query-history-icon');
  await expect(page.testSubj.locator('ESQLEditor-queryHistory')).toBeVisible();
};

const getHistoryQueryTexts = async (page: ScoutPage): Promise<string[]> => {
  const cells = page.testSubj.locator('ESQLEditor-queryHistory').getByRole('cell');
  // The history list can take a moment to populate after opening.
  await expect(cells).not.toHaveCount(0, { timeout: 20_000 });
  return cells.allInnerTexts();
};

spaceTest.describe('Discover ES|QL view - query history', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
    // Submit an explicit query so a known entry is recorded in the history.
    // The implicit query run on initial page load can't be relied on: it is
    // environment-dependent (e.g. the observability root profile defaults to
    // `FROM <all logs index pattern>` instead of the default data view).
    await pageObjects.discover.codeEditor.setCodeEditorValue('FROM logstash-* | LIMIT 10');
    await pageObjects.discover.submitQuery();
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('records the current query in the history', async ({ page }) => {
    await openQueryHistory(page);
    const historyTexts = await getHistoryQueryTexts(page);
    expect(historyTexts.some((text) => text.includes('FROM logstash-*'))).toBe(true);
  });

  spaceTest('records an updated query in the history', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    const testQuery = 'from logstash-* | limit 100 | drop @timestamp';
    await discover.codeEditor.setCodeEditorValue(testQuery);
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();

    await openQueryHistory(page);
    const historyTexts = await getHistoryQueryTexts(page);
    expect(historyTexts.some((text) => text.includes(testQuery))).toBe(true);
  });

  spaceTest('selects a query from the history and re-submits it', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    const testQuery = 'from logstash-* | limit 100 | drop @timestamp';
    await discover.codeEditor.setCodeEditorValue(testQuery);
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();

    await openQueryHistory(page);
    const rows = page.testSubj.locator('ESQLEditor-queryHistory').locator('tbody tr');
    await rows
      .filter({ hasText: testQuery })
      .getByTestId('ESQLEditor-history-starred-queries-run-button')
      .click();

    expect(await discover.codeEditor.getCodeEditorValue()).toBe(testQuery);
  });

  spaceTest('flags a failed query in the history', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    const testQuery = 'from logstash-* | limit 100 | woof and meow';
    await discover.codeEditor.setCodeEditorValue(testQuery);
    await discover.submitQuery();

    await openQueryHistory(page);
    const rows = page.testSubj.locator('ESQLEditor-queryHistory').locator('tbody tr');
    const failedRow = rows.filter({ hasText: testQuery });
    await expect(failedRow.getByTestId('ESQLEditor-queryHistory-error')).toBeVisible();
  });
});
