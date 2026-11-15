/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { tags, type ApiServicesFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../../common/ui/fixtures';

const createDefaultSession = async (apiServices: ApiServicesFixture, title: string) =>
  await apiServices.discover.create({
    title,
    tabs: [
      {
        id: 'default-tab',
        label: 'Default tab',
        data_source: {
          type: 'data_view_reference',
          ref_id: testData.DEFAULT_DATA_VIEW,
        },
        column_order: ['agent', 'bytes', 'clientip'],
        sort: [{ name: '@timestamp', direction: 'desc' }],
        query: { language: 'lucene', expression: '' },
        filters: [],
      },
    ],
  });

const createTabbedSession = async (apiServices: ApiServicesFixture, title: string) =>
  await apiServices.discover.create({
    title,
    tabs: [
      {
        id: 'default-tab',
        label: 'Default tab',
        data_source: {
          type: 'data_view_reference',
          ref_id: testData.DEFAULT_DATA_VIEW,
        },
        column_order: ['@timestamp', 'agent'],
        sort: [{ name: '@timestamp', direction: 'desc' }],
        query: { language: 'kql', expression: '' },
        filters: [],
      },
      {
        id: 'filtered-tab',
        label: 'Filtered tab',
        data_source: {
          type: 'data_view_reference',
          ref_id: testData.DEFAULT_DATA_VIEW,
        },
        column_order: ['bytes', 'clientip'],
        sort: [{ name: 'bytes', direction: 'asc' }],
        query: { language: 'kql', expression: 'bytes > 5000' },
        filters: [],
      },
    ],
  });

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
    apiServices,
    kbnClient,
    page,
    pageObjects,
  }) => {
    const savedSearchTitle = `TempSearch ${randomUUID().replace(/-/g, '')}`;
    const dashboardTitle = `Dashboard with deleted saved search ${randomUUID()}`;

    await pageObjects.dashboard.openNewDashboard();
    const savedSearchId = await createDefaultSession(apiServices, savedSearchTitle);
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

  test('should support URL drilldown', async ({ apiServices, page, pageObjects }) => {
    const drilldownName = `URL drilldown ${randomUUID()}`;
    const dashboardTitle = `Dashboard URL drilldown ${randomUUID()}`;
    const searchTitle = `URL drilldown saved search ${randomUUID().replace(/-/g, '')}`;
    const urlTemplate =
      "{{kibanaUrl}}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'{{context.panel.timeRange.from}}',to:'{{context.panel.timeRange.to}}'))" +
      "&_a=(columns:!(_source),filters:{{rison context.panel.filters}},index:'{{context.panel.indexPatternId}}',interval:auto," +
      "query:(language:{{context.panel.query.language}},query:'clientip:239.190.189.77'),sort:!())";

    await pageObjects.dashboard.openNewDashboard();
    const searchId = await createDefaultSession(apiServices, searchTitle);
    createdSavedObjects.push({ type: 'search', id: searchId });
    await pageObjects.dashboard.addPanelFromLibrary(searchTitle);
    await page.testSubj.locator('savedSearchTotalDocuments').waitFor({ state: 'visible' });
    await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN');
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
    await pageObjects.dashboard.ensureViewMode();

    await pageObjects.dashboard.openPanelContextMenu(searchTitle);
    const [discoverPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByText(drilldownName, { exact: true }).click(),
    ]);

    await expect(discoverPage.locator('[data-test-subj="queryInput"]')).toHaveText(
      'clientip:239.190.189.77'
    );
    await expect(discoverPage.locator('[data-test-subj="discoverQueryHits"]')).toHaveText('15');
  });

  test('should apply data, columns and sorting from selected Discover tab', async ({
    apiServices,
    page,
    pageObjects,
  }) => {
    const searchTitle = `Discover embeddable multi tab ${randomUUID().replace(/-/g, '')}`;

    const searchId = await createTabbedSession(apiServices, searchTitle);
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
    apiServices,
    page,
    pageObjects,
  }) => {
    const searchTitle = `Discover embeddable deleted tab ${randomUUID().replace(/-/g, '')}`;
    const dashboardTitle = `Dashboard deleted tab ${randomUUID()}`;

    const searchId = await createTabbedSession(apiServices, searchTitle);
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
    await pageObjects.dashboard.ensureEditMode();
    await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel', searchTitle);
    await expect(page.testSubj.locator('discoverEmbeddableInlineEditSelectTabAction')).toHaveText(
      '(Deleted tab)'
    );
    await pageObjects.dashboard.selectDiscoverEmbeddableTab('Default tab');
    await pageObjects.dashboard.applyDiscoverEmbeddableInlineEdits();

    await expect(page.testSubj.locator('docTable')).toBeVisible();
  });
});
