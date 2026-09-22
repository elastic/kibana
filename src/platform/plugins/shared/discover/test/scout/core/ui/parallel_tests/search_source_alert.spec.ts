/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

async function openDiscoverSearchThresholdRuleFlyout(page: ScoutPage) {
  await page.testSubj.click('app-menu-overflow-button');
  await page.testSubj.waitForSelector('discoverAlertsButton');
  await page.testSubj.click('discoverAlertsButton');

  if (await page.testSubj.isVisible('discoverLegacySearchThresholdRule')) {
    await page.testSubj.click('discoverLegacySearchThresholdRule');
  }

  if (await page.testSubj.isVisible('discoverCreateAlertButton')) {
    const createButton = page.testSubj.locator('discoverCreateAlertButton');
    if (await createButton.isEnabled()) {
      await page.testSubj.click('discoverCreateAlertButton');
    }
  }

  await page.testSubj.waitForSelector('addRuleFlyoutTitle');
}

const SOURCE_INDEX = 'search-source-alert';
const OUTPUT_INDEX = 'search-source-alert-output';
const CONNECTOR_NAME = 'search-source-alert-test-connector';
const RULE_NAME = 'test-search-source-alert';

async function defineSearchSourceAlert(page: ScoutPage, alertName: string) {
  await page.testSubj.click('thresholdPopover');
  await page.testSubj.fill('alertThresholdInput0', '1');

  await page.testSubj.click('forLastExpression');
  await page.testSubj.fill('timeWindowSizeNumber', '30');

  await page.testSubj.click('ruleFormStep-actions');
  await page.testSubj.locator('ruleActionsAddActionButton').waitFor({ state: 'visible' });
  await page.testSubj.click('ruleActionsAddActionButton');

  await page.locator('[data-action-type-id=".index"]').click();
  await page.testSubj.locator('ruleActionsItem').waitFor({ state: 'visible' });

  await page.testSubj.locator('kibanaCodeEditor').locator('textarea').waitFor({ state: 'visible' });
  await new KibanaCodeEditorWrapper(page).setCodeEditorValue(`{
    "rule_id": "{{rule.id}}",
    "rule_name": "{{rule.name}}",
    "alert_id": "{{alert.id}}",
    "context_link": "{{context.link}}"
  }`);

  await page.testSubj.click('ruleFormStep-details');
  await page.testSubj.fill('ruleDetailsNameInput', alertName);

  await page.testSubj.click('ruleFormStep-definition');
}

spaceTest.describe('Discover app - search source alert', { tag: tags.deploymentAgnostic }, () => {
  const createdDataViewIds: string[] = [];
  let connectorId: string | undefined;

  spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
    await esClient.indices.delete({
      index: [SOURCE_INDEX, OUTPUT_INDEX],
      ignore_unavailable: true,
    });

    await esClient.indices.create({
      index: SOURCE_INDEX,
      settings: { number_of_shards: 1 },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          message: { type: 'keyword' },
        },
      },
    });

    const timestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await esClient.bulk({
      refresh: 'wait_for',
      operations: Array.from({ length: 5 }, (_, i) => [
        { index: { _index: SOURCE_INDEX } },
        { '@timestamp': timestamp, message: `msg-${i}` },
      ]).flat(),
    });

    await esClient.indices.create({
      index: OUTPUT_INDEX,
      settings: { number_of_shards: 1 },
      mappings: {
        properties: {
          rule_id: { type: 'text' },
          rule_name: { type: 'text' },
          alert_id: { type: 'text' },
          context_link: { type: 'text' },
        },
      },
    });

    const connector = await apiServices.alerting.connectors.create(
      {
        name: CONNECTOR_NAME,
        connectorTypeId: '.index',
        config: { index: OUTPUT_INDEX },
        secrets: {},
      },
      scoutSpace.id
    );
    connectorId = connector.id;
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ apiServices, esClient, scoutSpace }) => {
    await Promise.all(
      createdDataViewIds.map((dataViewId) =>
        apiServices.dataViews.delete(dataViewId, scoutSpace.id)
      )
    );
    if (connectorId) {
      await apiServices.alerting.connectors.delete(connectorId, scoutSpace.id);
    }
    await esClient.indices.delete({
      index: [SOURCE_INDEX, OUTPUT_INDEX],
      ignore_unavailable: true,
    });
  });

  spaceTest('should allow creating an alert when there are no data views', async ({ page }) => {
    await page.gotoApp('management/insightsAndAlerting/triggersActions');

    await page.testSubj.click('createFirstRuleButton');
    await page.testSubj.click('.es-query-SelectOption');
    await page.testSubj.click('queryFormType_searchSource');
    await page.testSubj.waitForSelector('selectDataViewExpression');

    const dataViewSelector = page.testSubj.locator('selectDataViewExpression');
    await expect(dataViewSelector).toContainText('data view Select a data view');
  });

  spaceTest('when there are data views', async ({ pageObjects, apiServices, scoutSpace, page }) => {
    await spaceTest.step('should create data views', async () => {
      const {
        data: { id: searchSourceAlertDataViewId },
      } = await apiServices.dataViews.create({
        title: 'search-source-alert',
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      const {
        data: { id: searchSourceAlertOutputDataViewId },
      } = await apiServices.dataViews.create({
        title: 'search-source-alert-output',
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      const {
        data: { id: searchSourceAlertWildcardDataViewId },
      } = await apiServices.dataViews.create({
        title: 'search-*',
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      createdDataViewIds.push(
        searchSourceAlertDataViewId,
        searchSourceAlertOutputDataViewId,
        searchSourceAlertWildcardDataViewId
      );
    });

    await spaceTest.step('should show time field validation error', async () => {
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.selectDataView('search-source-alert');
      await pageObjects.datePicker.setCommonlyUsedTime('Last_15 minutes');

      await openDiscoverSearchThresholdRuleFlyout(page);
      // await defineSearchSourceAlert(page, RULE_NAME);

      await page.testSubj.click('selectDataViewExpression');
      const dataViewSearchInput = page.testSubj.locator('indexPattern-switcher--input');
      await dataViewSearchInput.waitFor({ state: 'visible' });
      await dataViewSearchInput.fill('search-source-alert-o*');
      await page.testSubj.click('explore-matching-indices-button');

      const dataViewSelector = page.testSubj.locator('selectDataViewExpression');
      await expect(dataViewSelector).toContainText('search-source-alert-o*');

      await expect(page.testSubj.locator('esQueryAlertExpressionError')).toHaveText(
        'Data view should have a time field.'
      );
    });

    await spaceTest.step('should create the alert', async () => {
      await defineSearchSourceAlert(page, RULE_NAME);

      await page.testSubj.click('selectDataViewExpression');
      const dataViewSwitcher = page.testSubj.locator('indexPattern-switcher');
      await dataViewSwitcher.waitFor({ state: 'visible' });
      await page.testSubj.locator('indexPattern-switcher--input').fill('');
      await dataViewSwitcher.locator(`[data-test-subj="dataView-${SOURCE_INDEX}"]`).click();

      const dataViewSelector = page.testSubj.locator('selectDataViewExpression');
      await expect(dataViewSelector).toContainText(SOURCE_INDEX);

      await page.testSubj.click('ruleFormStep-details');
      await page.components.toast().closeAll();
      const saveButton = page.testSubj.locator('ruleFlyoutFooterSaveButton');
      await saveButton.click();
      await saveButton.waitFor({ state: 'hidden' });
    });

    await spaceTest.step('should navigate to alert results via view in app link', async () => {
      await page.gotoApp('management/insightsAndAlerting/triggersActions');
      const rulesList = page.testSubj.locator('rulesList');
      await rulesList.waitFor({ state: 'visible' });
      await rulesList.locator(`[data-test-subj="rulesListTableRowName-${RULE_NAME}"]`).click();

      await page.testSubj.click('app-menu-overflow-button');
      await page.testSubj.click('ruleDetails-viewInDiscover');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await expect(page.testSubj.locator('globalToastList')).toBeHidden();
      expect(await pageObjects.filterBar.getFilterCount()).toBe(0);
      expect(await pageObjects.queryBar.getQuery()).toBe('');
      await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(SOURCE_INDEX);
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
    });
  });
});
