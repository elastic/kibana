/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Client } from '@elastic/elasticsearch';
import type { ApiServicesFixture, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  getSearchSourceRuleParams,
  spaceTest,
  type DiscoverPageObjects,
} from '../../../common/ui/fixtures';

const SOURCE_INDEX_PREFIX = 'search-source-alert';
const OUTPUT_INDEX_PREFIX = 'search-source-alert-output';

const getUpdatedSearchSourceRuleParams = (dataViewId: string) =>
  getSearchSourceRuleParams(dataViewId, 'message:msg-1', [
    {
      meta: {
        alias: null,
        disabled: false,
        index: dataViewId,
        key: 'message.keyword',
        negate: false,
        params: { query: 'msg-1' },
        type: 'phrase',
      },
      query: { match_phrase: { 'message.keyword': 'msg-1' } },
    },
  ]);

const getAdHocDataViewSpec = (id: string, title: string) => ({
  id,
  title,
  name: '',
  timeFieldName: '@timestamp',
  sourceFilters: [],
  fieldFormats: {},
  runtimeFieldMap: {
    'runtime-message-field': {
      type: 'keyword',
      script: { source: "emit('mock-message')" },
    },
  },
  fieldAttrs: {},
  allowNoIndex: false,
  allowHidden: false,
  managed: false,
  type: 'index-pattern',
});

const refreshSourceDocuments = async (esClient: Client, sourceIndex: string): Promise<void> => {
  const timestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await esClient.bulk({
    refresh: 'wait_for',
    operations: Array.from({ length: 5 }, (_, i) => [
      { index: { _index: sourceIndex, _id: `search-source-alert-${i}` } },
      { '@timestamp': timestamp, message: `msg-${i}` },
    ]).flat(),
  });
};

const createSearchSourceRule = async ({
  apiServices,
  connectorId,
  dataViewId,
  name,
  searchConfigurationIndex,
  spaceId,
}: {
  apiServices: ApiServicesFixture;
  connectorId: string;
  dataViewId: string;
  name: string;
  searchConfigurationIndex?: Record<string, unknown>;
  spaceId: string;
}) => {
  const response = await apiServices.alerting.rules.create(
    {
      name,
      ruleTypeId: '.es-query',
      consumer: 'stackAlerts',
      enabled: true,
      schedule: { interval: '1m' },
      notifyWhen: 'onActiveAlert',
      params: getSearchSourceRuleParams(searchConfigurationIndex ?? dataViewId),
      actions: [
        {
          id: connectorId,
          group: 'query matched',
          params: {
            documents: [
              {
                rule_id: '{{rule.id}}',
                rule_name: '{{rule.name}}',
                alert_id: '{{alert.id}}',
                context_link: '{{context.link}}',
              },
            ],
          },
        },
      ],
    },
    spaceId
  );
  const ruleId = response.data.id as string;
  await apiServices.alerting.rules.runSoon(ruleId, spaceId);
  return ruleId;
};

const getGeneratedContextLink = async (esClient: Client, outputIndex: string, ruleId: string) => {
  let contextLink = '';
  await expect
    .poll(
      async () => {
        const response = await esClient.search<{
          rule_id: string;
          context_link: string;
        }>({
          index: outputIndex,
          query: { match_phrase: { rule_id: ruleId } },
          size: 1,
        });
        contextLink = response.hits.hits[0]?._source?.context_link ?? '';
        return contextLink;
      },
      { timeout: 90_000, intervals: [1_000] }
    )
    .not.toBe('');
  return contextLink;
};

const openRuleInManagement = async (page: ScoutPage, ruleName: string) => {
  await page.gotoApp('management/insightsAndAlerting/triggersActions/rules');
  const rulesList = page.testSubj.locator('rulesList');
  await rulesList.waitFor({ state: 'visible' });
  await rulesList.locator(`[data-test-subj="rulesListTableRowName-${ruleName}"]`).click();
};

const assertInitialResults = async (
  pageObjects: DiscoverPageObjects,
  dataViewName: string
): Promise<void> => {
  expect(await pageObjects.filterBar.getFilterCount()).toBe(0);
  expect(await pageObjects.queryBar.getQuery()).toBe('');
  await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(dataViewName);
  await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
};

const assertCurrentResults = async (
  pageObjects: DiscoverPageObjects,
  dataViewId: string
): Promise<void> => {
  expect(await pageObjects.queryBar.getQuery()).toBe('message:msg-1');
  expect(
    await pageObjects.filterBar.hasFilter({
      field: 'message.keyword',
      value: 'msg-1',
    })
  ).toBe(true);
  await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(1);
  expect(await pageObjects.discover.getCurrentDataViewId()).toBe(dataViewId);
};

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
  // Generated notification links depend on an asynchronously executed rule and can take up to 90 seconds.
  spaceTest.setTimeout(150_000);

  const createdDataViewIds: string[] = [];
  const createdRuleIds: string[] = [];
  let connectorId = '';
  let sourceDataViewId = '';
  let sourceIndex = '';
  let outputIndex = '';
  let otherDataView = '';

  spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
    const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
    sourceIndex = `${SOURCE_INDEX_PREFIX}-${uniqueSuffix}`;
    outputIndex = `${OUTPUT_INDEX_PREFIX}-${uniqueSuffix}`;
    otherDataView = `${SOURCE_INDEX_PREFIX}-${uniqueSuffix}*`;

    await esClient.indices.create({
      index: sourceIndex,
      settings: { number_of_shards: 1 },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          message: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
        },
      },
    });

    await refreshSourceDocuments(esClient, sourceIndex);

    await esClient.indices.create({
      index: outputIndex,
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
        name: `search-source-alert-test-connector-${uniqueSuffix}`,
        connectorTypeId: '.index',
        config: { index: outputIndex },
        secrets: {},
      },
      scoutSpace.id
    );
    connectorId = connector.id;

    const sourceDataViewResponse = await apiServices.dataViews.create({
      title: sourceIndex,
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    sourceDataViewId = sourceDataViewResponse.data.id;
    const {
      data: { id: outputDataViewId },
    } = await apiServices.dataViews.create({
      title: outputIndex,
      spaceId: scoutSpace.id,
    });
    const {
      data: { id: searchSourceAlertWildcardDataViewId },
    } = await apiServices.dataViews.create({
      title: otherDataView,
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    createdDataViewIds.push(
      sourceDataViewId,
      outputDataViewId,
      searchSourceAlertWildcardDataViewId
    );
  });

  spaceTest.beforeEach(async ({ browserAuth, esClient }) => {
    await browserAuth.loginAsAdmin();
    await refreshSourceDocuments(esClient, sourceIndex);
  });

  spaceTest.afterAll(async ({ apiServices, esClient, scoutSpace }) => {
    await Promise.all(
      createdRuleIds.map((ruleId) => apiServices.alerting.rules.delete(ruleId, scoutSpace.id))
    );
    await Promise.all(
      createdDataViewIds.map((dataViewId) =>
        apiServices.dataViews.delete(dataViewId, scoutSpace.id)
      )
    );
    if (connectorId) {
      await apiServices.alerting.connectors.delete(connectorId, scoutSpace.id);
    }
    await esClient.indices.delete({
      index: [sourceIndex, outputIndex],
      ignore_unavailable: true,
    });
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should validate the time field and create an alert',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const alertName = `tmp-rule-${Date.now()}`;
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.selectDataView(sourceIndex);
      await pageObjects.datePicker.setCommonlyUsedTime('Last_15 minutes');

      await pageObjects.discover.openSearchThresholdRuleFlyout();
      await defineSearchSourceAlert(page, alertName);

      await spaceTest.step('rejects a data view without a time field', async () => {
        await page.testSubj.click('selectDataViewExpression');
        const dataViewSearchInput = page.testSubj.locator('indexPattern-switcher--input');
        await dataViewSearchInput.waitFor({ state: 'visible' });
        await dataViewSearchInput.fill('search-source-alert-o*');
        await page.testSubj.click('explore-matching-indices-button');

        await expect(page.testSubj.locator('selectDataViewExpression')).toContainText(
          'search-source-alert-o*'
        );
        await expect(page.testSubj.locator('esQueryAlertExpressionError')).toHaveText(
          'Data view should have a time field.'
        );
        await page.testSubj.click('ruleFormStep-details');
        await page.components.toast().closeAll();
        await expect(page.testSubj.locator('ruleFlyoutFooterSaveButton')).toBeDisabled();
        await page.testSubj.click('ruleFormStep-definition');
      });

      await spaceTest.step('switches to a valid data view and creates the alert', async () => {
        await page.testSubj.click('selectDataViewExpression');
        const dataViewSwitcher = page.testSubj.locator('indexPattern-switcher');
        await dataViewSwitcher.waitFor({ state: 'visible' });
        await page.testSubj.locator('indexPattern-switcher--input').fill('');
        await dataViewSwitcher.locator(`[data-test-subj="dataView-${sourceIndex}"]`).click();

        await expect(page.testSubj.locator('selectDataViewExpression')).toContainText(sourceIndex);
        await expect(page.testSubj.locator('esQueryAlertExpressionError')).toBeHidden();

        await page.testSubj.click('ruleFormStep-details');
        await page.components.toast().closeAll();
        const saveButton = page.testSubj.locator('ruleFlyoutFooterSaveButton');
        await saveButton.click();
        await saveButton.waitFor({ state: 'hidden' });

        await pageObjects.toasts.waitForToastWithText('Created rule');
        const {
          data: { data: createdRules },
        } = await apiServices.alerting.rules.find(
          { search: alertName, search_fields: 'name' },
          scoutSpace.id
        );
        const [createdRule] = createdRules;
        expect(createdRule).toBeDefined();
        createdRuleIds.push(createdRule.id);
        await getGeneratedContextLink(esClient, outputIndex, createdRule.id);
      });
    }
  );

  spaceTest(
    'should preserve snapshot rule state while View in Discover uses updated params',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const ruleName = `updated-rule-state-${scoutSpace.id}-${Date.now()}`;
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId: sourceDataViewId,
        name: ruleName,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      const contextLink = await getGeneratedContextLink(esClient, outputIndex, ruleId);

      await spaceTest.step('updates the rule through the edit UI', async () => {
        await openRuleInManagement(page, ruleName);
        await page.testSubj.click('app-menu-overflow-button');
        await page.testSubj.click('openEditRuleFlyoutButton');
        await page.testSubj.locator('ruleForm').waitFor({ state: 'visible' });
        await pageObjects.queryBar.setQuery('message:msg-1');
        await pageObjects.filterBar.addFilter({
          field: 'message.keyword',
          operator: 'is',
          value: 'msg-1',
        });
        await page.testSubj.click('thresholdPopover');
        await page.testSubj.fill('alertThresholdInput0', '1');
        await page.testSubj.click('rulePageFooterSaveButton');
        await page.testSubj.locator('ruleForm').waitFor({ state: 'hidden' });
      });

      await spaceTest.step('the previous notification link restores original params', async () => {
        await page.goto(new URL(contextLink, page.url()).toString());
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();

        await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
        await assertInitialResults(pageObjects, sourceIndex);
      });

      await spaceTest.step('View in Discover uses current params', async () => {
        await openRuleInManagement(page, ruleName);
        await page.testSubj.click('app-menu-overflow-button');
        await page.testSubj.click('ruleDetails-viewInDiscover');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();

        await expect(page.testSubj.locator('globalToastList')).toBeHidden();
        await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(sourceIndex);
        await assertCurrentResults(pageObjects, sourceDataViewId);
      });
    }
  );

  spaceTest(
    'should not overwrite current data view with alert data view when starting or saving a Discover session',
    async ({ apiServices, page, pageObjects, scoutSpace }) => {
      const ruleName = `session-data-view-${scoutSpace.id}-${Date.now()}`;
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId: sourceDataViewId,
        name: ruleName,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      const openRuleInDiscover = async () => {
        await openRuleInManagement(page, ruleName);
        await page.testSubj.click('app-menu-overflow-button');
        await page.testSubj.click('ruleDetails-viewInDiscover');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();
      };

      await openRuleInDiscover();

      await expect(page.testSubj.locator('globalToastList')).toBeHidden();
      await assertInitialResults(pageObjects, sourceIndex);
      expect(await pageObjects.discover.getCurrentDataViewId()).toBe(sourceDataViewId);

      await pageObjects.discover.selectDataView(otherDataView);
      await pageObjects.discover.clickNewSearch();

      expect(await pageObjects.discover.getSelectedDataViewName()).toBe(otherDataView);

      await openRuleInDiscover();
      await pageObjects.discover.selectDataView(otherDataView);
      await pageObjects.discover.saveSearch(
        `search-source-alert-session-${scoutSpace.id}-${Date.now()}`
      );

      expect(await pageObjects.discover.getSelectedDataViewName()).toBe(otherDataView);
    }
  );

  spaceTest(
    'should preserve snapshot data view state while View in Discover uses current state',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
      const initialDataViewTitle = `search-source-alert-original-${uniqueSuffix}`;
      const updatedDataViewTitle = `search-source-alert-updated-${uniqueSuffix}`;
      await esClient.indices.updateAliases({
        actions: [
          { add: { index: sourceIndex, alias: initialDataViewTitle } },
          { add: { index: sourceIndex, alias: updatedDataViewTitle } },
        ],
      });

      const dataViewResponse = await apiServices.dataViews.create({
        title: initialDataViewTitle,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      const dataViewId = dataViewResponse.data.id;
      createdDataViewIds.push(dataViewId);

      const ruleName = `updated-data-view-state-${uniqueSuffix}`;
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId,
        name: ruleName,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      const contextLink = await getGeneratedContextLink(esClient, outputIndex, ruleId);

      await apiServices.alerting.rules.update(
        ruleId,
        {
          params: getUpdatedSearchSourceRuleParams(dataViewId),
        },
        scoutSpace.id
      );
      await apiServices.dataViews.update(dataViewId, {
        title: updatedDataViewTitle,
        sourceFilters: [{ value: 'message' }],
        spaceId: scoutSpace.id,
      });

      await spaceTest.step('the previous notification link restores original state', async () => {
        await page.goto(new URL(contextLink, page.url()).toString());
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();

        await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
        await assertInitialResults(pageObjects, initialDataViewTitle);
        await expect
          .poll(async () =>
            (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
          )
          .toBe(true);
      });

      await spaceTest.step('View in Discover uses current state', async () => {
        await openRuleInManagement(page, ruleName);
        await page.testSubj.click('app-menu-overflow-button');
        await page.testSubj.click('ruleDetails-viewInDiscover');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();

        await expect(page.testSubj.locator('globalToastList')).toBeHidden();
        await assertCurrentResults(pageObjects, dataViewId);
        await expect
          .poll(async () =>
            (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
          )
          .toBe(false);

        await pageObjects.discover.getSelectedDataView().click();
        await page.testSubj.locator('indexPattern-switcher').waitFor({ state: 'visible' });
        await page.testSubj.click('indexPattern-manage-field');
        await page.testSubj.locator('indexPatternEditorFlyout').waitFor({ state: 'visible' });
        await expect(page.testSubj.locator('createIndexPatternTitleInput')).toHaveValue(
          updatedDataViewTitle
        );
      });
    }
  );

  spaceTest(
    'should navigate to ad-hoc alert results via snapshot and current links',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
      const adHocDataViewId = `search-source-adhoc-${uniqueSuffix}`;
      const ruleName = `adhoc-data-view-${uniqueSuffix}`;
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId: adHocDataViewId,
        name: ruleName,
        searchConfigurationIndex: getAdHocDataViewSpec(adHocDataViewId, sourceIndex),
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      const contextLink = await getGeneratedContextLink(esClient, outputIndex, ruleId);

      const assertAdHocResults = async () => {
        await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(sourceIndex);
        await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
        await expect(pageObjects.dataGrid.getCell(0, '_source')).toContainText(
          'runtime-message-field'
        );
        await expect(pageObjects.dataGrid.getCell(0, '_source')).toContainText('mock-message');
      };

      await spaceTest.step('opens snapshot results from the notification link', async () => {
        await page.goto(new URL(contextLink, page.url()).toString());
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();
        await assertAdHocResults();
      });

      await spaceTest.step('opens current results from View in Discover', async () => {
        await openRuleInManagement(page, ruleName);
        await page.testSubj.click('app-menu-overflow-button');
        await page.testSubj.click('ruleDetails-viewInDiscover');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();

        await expect(page.testSubj.locator('globalToastList')).toBeHidden();
        await assertAdHocResults();
      });
    }
  );

  spaceTest(
    'should preserve snapshot results but reject current results after data view removal',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
      const dataViewTitle = `search-source-alert-deleted-${uniqueSuffix}`;
      await esClient.indices.putAlias({
        index: sourceIndex,
        name: dataViewTitle,
      });

      const dataViewResponse = await apiServices.dataViews.create({
        title: dataViewTitle,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      const dataViewId = dataViewResponse.data.id;
      createdDataViewIds.push(dataViewId);

      const ruleName = `deleted-data-view-${uniqueSuffix}`;
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId,
        name: ruleName,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      const contextLink = await getGeneratedContextLink(esClient, outputIndex, ruleId);
      await apiServices.dataViews.delete(dataViewId, scoutSpace.id);

      await spaceTest.step('the previous notification link still renders results', async () => {
        await page.goto(new URL(contextLink, page.url()).toString());
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();

        await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
        await assertInitialResults(pageObjects, dataViewTitle);
        await expect
          .poll(async () =>
            (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
          )
          .toBe(true);
      });

      await spaceTest.step('View in Discover reports the missing data view', async () => {
        await openRuleInManagement(page, ruleName);
        await page.testSubj.click('app-menu-overflow-button');
        await page.testSubj.click('ruleDetails-viewInDiscover');

        await pageObjects.toasts.waitForToastWithText(
          `Could not locate that data view (id: ${dataViewId}), click here to re-create it`
        );
        await expect(page.testSubj.locator('docTable')).toBeHidden();
      });
    }
  );

  spaceTest(
    'should display results after rule removal on following generated link',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
      const dataViewTitle = `search-source-alert-deleted-rule-${uniqueSuffix}`;
      await esClient.indices.putAlias({
        index: sourceIndex,
        name: dataViewTitle,
      });

      const dataViewResponse = await apiServices.dataViews.create({
        title: dataViewTitle,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      const dataViewId = dataViewResponse.data.id;
      createdDataViewIds.push(dataViewId);

      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId,
        name: `deleted-rule-snapshot-${uniqueSuffix}`,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      const contextLink = await getGeneratedContextLink(esClient, outputIndex, ruleId);
      await apiServices.alerting.rules.delete(ruleId, scoutSpace.id);

      await page.goto(new URL(contextLink, page.url()).toString());
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
      await assertInitialResults(pageObjects, dataViewTitle);
      await expect
        .poll(async () =>
          (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
        )
        .toBe(true);
    }
  );
});
