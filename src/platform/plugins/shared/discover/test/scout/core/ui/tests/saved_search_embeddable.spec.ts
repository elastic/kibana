/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import type { ScoutWorkerFixtures } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../../common/ui/fixtures';

const createSavedSearch = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  searchId: string,
  searchTitle: string,
  dataViewId: string,
  tabs?: Array<{
    id: string;
    label: string;
    attributes: {
      columns: string[];
      sort: Array<[string, 'asc' | 'desc']>;
      kibanaSavedObjectMeta: { searchSourceJSON: string };
    };
  }>
) =>
  await kbnClient.savedObjects.create({
    type: 'search',
    id: searchId,
    overwrite: false,
    attributes: {
      title: searchTitle,
      description: '',
      columns: ['agent', 'bytes', 'clientip'],
      sort: [['@timestamp', 'desc']],
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"highlightAll":true,"version":true,"query":{"language":"lucene","query":""},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      ...(tabs?.length ? { tabs } : {}),
    },
    references: [
      {
        id: dataViewId,
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  });

const createTabbedSavedSearch = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  searchId: string,
  searchTitle: string
) =>
  await createSavedSearch(kbnClient, searchId, searchTitle, testData.DEFAULT_DATA_VIEW, [
    {
      id: 'default-tab',
      label: 'Default tab',
      attributes: {
        columns: ['@timestamp', 'agent'],
        sort: [['@timestamp', 'desc']],
        kibanaSavedObjectMeta: {
          searchSourceJSON:
            '{"highlightAll":true,"version":true,"query":{"language":"kuery","query":""},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
        },
      },
    },
    {
      id: 'filtered-tab',
      label: 'Filtered tab',
      attributes: {
        columns: ['bytes', 'clientip'],
        sort: [['bytes', 'asc']],
        kibanaSavedObjectMeta: {
          searchSourceJSON:
            '{"highlightAll":true,"version":true,"query":{"language":"kuery","query":"bytes > 5000"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
        },
      },
    },
  ]);

const getCurrentDashboardId = (url: string) => {
  const dashboardId = new URL(url).hash.match(/\/view\/([^?]+)/)?.[1];
  if (!dashboardId) {
    throw new Error('Expected the saved dashboard URL to contain an ID');
  }
  return dashboardId;
};

test.describe('Discover app - saved search embeddable', { tag: tags.deploymentAgnostic }, () => {
  const createdSavedObjects: Array<{ type: 'dashboard' | 'search'; id: string }> = [];

  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    await esArchiver.loadIfNeeded(testData.LOGSTASH_ES_ARCHIVE);
    await kbnClient.importExport.load(testData.DASHBOARD_DRILLDOWNS_KBN_ARCHIVE);
    await uiSettings.set({
      defaultIndex: testData.DEFAULT_DATA_VIEW, // TODO: investigate why it is required for `node scripts/playwright_test.js` run
      'timepicker:timeDefaults': JSON.stringify(testData.DEFAULT_TIME_RANGE),
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.goto();
  });

  test.afterEach(async ({ kbnClient }) => {
    await Promise.all(
      createdSavedObjects
        .splice(0)
        .map(async ({ type, id }) => kbnClient.savedObjects.delete({ type, id }))
    );
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should allow removing the dashboard panel after the underlying saved search has been deleted', async ({
    kbnClient,
    page,
    pageObjects,
  }) => {
    const savedSearchId = randomUUID().replace(/-/g, '');
    const savedSearchTitle = `TempSearch ${savedSearchId}`;
    const dashboardTitle = `Dashboard with deleted saved search ${savedSearchId}`;

    await pageObjects.dashboard.openNewDashboard();
    await createSavedSearch(kbnClient, savedSearchId, savedSearchTitle, testData.DEFAULT_DATA_VIEW);
    await pageObjects.dashboard.addPanelFromLibrary(savedSearchTitle);
    await page.testSubj.locator('savedSearchTotalDocuments').waitFor({
      state: 'visible',
    });

    await pageObjects.dashboard.saveDashboard(dashboardTitle);
    createdSavedObjects.push({ type: 'dashboard', id: getCurrentDashboardId(page.url()) });
    await kbnClient.savedObjects.delete({
      type: 'search',
      id: savedSearchId,
    });

    await page.reload();
    await page.testSubj.waitForSelector('dashboardContainer', { timeout: 20000 });
    await expect(
      page.testSubj.locator('embeddableError'),
      'Embeddable error should be displayed'
    ).toBeVisible();

    await pageObjects.dashboard.removePanel('embeddableError');
    await expect(
      page.testSubj.locator('embeddableError'),
      'Embeddable error should not be displayed'
    ).toBeHidden();
  });

  test('should support URL drilldown', async ({ kbnClient, page, pageObjects }) => {
    const drilldownName = `URL drilldown ${randomUUID()}`;
    const dashboardTitle = `Dashboard URL drilldown ${randomUUID()}`;
    const searchId = randomUUID().replace(/-/g, '');
    const searchTitle = `URL drilldown saved search ${searchId}`;
    const urlTemplate =
      "{{kibanaUrl}}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'{{context.panel.timeRange.from}}',to:'{{context.panel.timeRange.to}}'))" +
      "&_a=(columns:!(_source),filters:{{rison context.panel.filters}},index:'{{context.panel.indexPatternId}}',interval:auto," +
      "query:(language:{{context.panel.query.language}},query:'clientip:239.190.189.77'),sort:!())";

    await pageObjects.dashboard.openNewDashboard();
    await createSavedSearch(kbnClient, searchId, searchTitle, testData.DEFAULT_DATA_VIEW);
    createdSavedObjects.push({ type: 'search', id: searchId });
    await pageObjects.dashboard.addPanelFromLibrary(searchTitle);
    await page.testSubj.locator('savedSearchTotalDocuments').waitFor({ state: 'visible' });
    await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-addDrilldown');
    await pageObjects.dashboard.createUrlDrilldown(
      drilldownName,
      urlTemplate,
      'on_open_panel_menu',
      true
    );
    await pageObjects.dashboard.saveDashboard(dashboardTitle);
    const dashboardId = getCurrentDashboardId(page.url());
    createdSavedObjects.push({ type: 'dashboard', id: dashboardId });
    await pageObjects.dashboard.openDashboardWithId(dashboardId);

    await pageObjects.dashboard.openPanelContextMenu(searchTitle);
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: drilldownName, exact: true }).click();
    const discoverPage = await popupPromise;

    await expect(discoverPage.locator('[data-test-subj="queryInput"]')).toHaveText(
      'clientip:239.190.189.77'
    );
    await expect(discoverPage.locator('[data-test-subj="discoverQueryHits"]')).toHaveText('6');
  });

  test('should apply data, columns and sorting from selected Discover tab', async ({
    kbnClient,
    page,
    pageObjects,
  }) => {
    const searchId = randomUUID().replace(/-/g, '');
    const searchTitle = `Discover embeddable multi tab ${searchId}`;

    await createTabbedSavedSearch(kbnClient, searchId, searchTitle);
    createdSavedObjects.push({ type: 'search', id: searchId });
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.dashboard.addPanelFromLibrary(searchTitle);
    await page.testSubj.locator('savedSearchTotalDocuments').waitFor({ state: 'visible' });

    const initialDocumentCount = await page.testSubj
      .locator('savedSearchTotalDocuments')
      .innerText();
    await expect(pageObjects.dataGrid.getColumnHeader('@timestamp')).toBeVisible();
    await expect(pageObjects.dataGrid.getColumnHeader('agent')).toBeVisible();

    await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel', searchTitle);
    await pageObjects.dashboard.selectDiscoverEmbeddableTab('Filtered tab');
    await pageObjects.dashboard.applyDiscoverEmbeddableInlineEdits();

    await expect(pageObjects.dataGrid.getColumnHeader('bytes')).toBeVisible();
    await expect(pageObjects.dataGrid.getColumnHeader('clientip')).toBeVisible();
    await expect(pageObjects.dataGrid.getColumnHeader('agent')).toBeHidden();
    const [firstBytesCell, secondBytesCell, switchedDocumentCount] = await Promise.all([
      pageObjects.dataGrid.getCellValue(0, 'bytes').innerText(),
      pageObjects.dataGrid.getCellValue(1, 'bytes').innerText(),
      page.testSubj.locator('savedSearchTotalDocuments').innerText(),
    ]);
    expect(switchedDocumentCount).not.toBe(initialDocumentCount);
    expect(Number(firstBytesCell.replace(/,/g, ''))).toBeLessThanOrEqual(
      Number(secondBytesCell.replace(/,/g, ''))
    );
  });

  test('should recover a deleted selected tab through inline editing', async ({
    kbnClient,
    page,
    pageObjects,
  }) => {
    const searchId = randomUUID().replace(/-/g, '');
    const searchTitle = `Discover embeddable deleted tab ${searchId}`;
    const dashboardTitle = `Dashboard deleted tab ${searchId}`;

    await createTabbedSavedSearch(kbnClient, searchId, searchTitle);
    createdSavedObjects.push({ type: 'search', id: searchId });
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.dashboard.addPanelFromLibrary(searchTitle);
    await page.testSubj.locator('savedSearchTotalDocuments').waitFor({ state: 'visible' });
    await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel', searchTitle);
    await pageObjects.dashboard.selectDiscoverEmbeddableTab('Filtered tab');
    await pageObjects.dashboard.applyDiscoverEmbeddableInlineEdits();
    await pageObjects.dashboard.saveDashboard(dashboardTitle);

    const dashboardId = getCurrentDashboardId(page.url());
    createdSavedObjects.push({ type: 'dashboard', id: dashboardId });

    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.loadSavedSearch(searchTitle);
    await pageObjects.unifiedTabs.navigateToTabByName('Filtered tab');
    await pageObjects.unifiedTabs.closeTabByName('Filtered tab');
    await pageObjects.discover.saveSearch(searchTitle);

    await pageObjects.dashboard.openDashboardWithId(dashboardId);
    await expect(page.testSubj.locator('discoverEmbeddableDeletedTabCallout')).toBeVisible();
    await page.testSubj.click('discoverEmbeddableDeletedTabEditPanelLink');
    await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel', searchTitle);
    await expect(page.testSubj.locator('discoverEmbeddableInlineEditSelectTabAction')).toHaveText(
      '(Deleted tab)'
    );
    await pageObjects.dashboard.selectDiscoverEmbeddableTab('Default tab');
    await pageObjects.dashboard.applyDiscoverEmbeddableInlineEdits();

    await expect(page.testSubj.locator('docTable')).toBeVisible();
  });
});
