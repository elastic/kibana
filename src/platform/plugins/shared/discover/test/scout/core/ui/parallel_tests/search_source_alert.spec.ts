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
const OTHER_DATA_VIEW = 'search-*';
const CONNECTOR_NAME = 'search-source-alert-test-connector';

const getSearchSourceRuleParams = (
  dataView: string | Record<string, unknown>,
  query = '',
  filter: Array<Record<string, unknown>> = []
) => ({
  searchType: 'searchSource',
  timeWindowSize: 30,
  timeWindowUnit: 'm',
  threshold: [1],
  thresholdComparator: '>',
  size: 100,
  aggType: 'count',
  groupBy: 'all',
  termSize: 5,
  excludeHitsFromPreviousRun: false,
  sourceFields: [],
  searchConfiguration: {
    query: { query, language: 'kuery' },
    index: dataView,
    filter,
  },
});

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

const getAdHocDataViewSpec = (id: string) => ({
  id,
  title: 'search-source-*',
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
  return response.data.id as string;
};

const getGeneratedContextLink = async (esClient: Client, ruleId: string) => {
  let contextLink = '';
  await expect
    .poll(
      async () => {
        const response = await esClient.search<{
          rule_id: string;
          context_link: string;
        }>({
          index: OUTPUT_INDEX,
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
  await page.gotoApp('management/insightsAndAlerting/triggersActions');
  const rulesList = page.testSubj.locator('rulesList');
  await rulesList.waitFor({ state: 'visible' });
  await rulesList.locator(`[data-test-subj="rulesListTableRowName-${ruleName}"]`).click();
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
  const createdDataViewIds: string[] = [];
  const createdRuleIds: string[] = [];
  let connectorId = '';
  let baselineRuleId = '';
  let baselineRuleName = '';
  let sourceDataViewId = '';

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
          message: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
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

    const sourceDataViewResponse = await apiServices.dataViews.create({
      title: 'search-source-alert',
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    sourceDataViewId = sourceDataViewResponse.data.id;
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
      sourceDataViewId,
      searchSourceAlertOutputDataViewId,
      searchSourceAlertWildcardDataViewId
    );

    baselineRuleName = `search-source-alert-${scoutSpace.id}`;
    baselineRuleId = await createSearchSourceRule({
      apiServices,
      connectorId: connector.id,
      dataViewId: sourceDataViewId,
      name: baselineRuleName,
      spaceId: scoutSpace.id,
    });
    createdRuleIds.push(baselineRuleId);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
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
      index: [SOURCE_INDEX, OUTPUT_INDEX],
      ignore_unavailable: true,
    });
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('should show time field validation error', async ({ page, pageObjects }) => {
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.selectDataView('search-source-alert');
    await pageObjects.datePicker.setCommonlyUsedTime('Last_15 minutes');

    await openDiscoverSearchThresholdRuleFlyout(page);

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

  spaceTest('should create an alert', async ({ page, pageObjects }) => {
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();

    await openDiscoverSearchThresholdRuleFlyout(page);
    await defineSearchSourceAlert(page, `tmp-rule-${Date.now()}`);

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

    await pageObjects.toasts.waitForToastWithText('Created rule');
  });

  spaceTest(
    'should navigate to alert results via view in app link',
    async ({ page, pageObjects }) => {
      await openRuleInManagement(page, baselineRuleName);

      await page.testSubj.click('app-menu-overflow-button');
      await page.testSubj.click('ruleDetails-viewInDiscover');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await expect(page.testSubj.locator('globalToastList')).toBeHidden();
      expect(await pageObjects.filterBar.getFilterCount()).toBe(0);
      expect(await pageObjects.queryBar.getQuery()).toBe('');
      await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(SOURCE_INDEX);
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
      expect(await pageObjects.discover.getCurrentDataViewId()).toBe(sourceDataViewId);
    }
  );

  spaceTest(
    'should navigate to alert results via link provided in notification',
    async ({ esClient, page, pageObjects }) => {
      const contextLink = await getGeneratedContextLink(esClient, baselineRuleId);

      await page.goto(new URL(contextLink, page.url()).toString());
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
      expect(await pageObjects.filterBar.getFilterCount()).toBe(0);
      expect(await pageObjects.queryBar.getQuery()).toBe('');
      await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(SOURCE_INDEX);
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
    }
  );

  spaceTest(
    'should display prev rule state after params update on clicking prev generated link',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId: sourceDataViewId,
        name: `previous-rule-state-${scoutSpace.id}-${Date.now()}`,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      const contextLink = await getGeneratedContextLink(esClient, ruleId);

      await apiServices.alerting.rules.update(
        ruleId,
        {
          params: getUpdatedSearchSourceRuleParams(sourceDataViewId),
        },
        scoutSpace.id
      );

      await page.goto(new URL(contextLink, page.url()).toString());
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
      expect(await pageObjects.filterBar.getFilterCount()).toBe(0);
      expect(await pageObjects.queryBar.getQuery()).toBe('');
      await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(SOURCE_INDEX);
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
    }
  );

  spaceTest(
    'should display actual state after rule params update on clicking viewInApp link',
    async ({ apiServices, page, pageObjects, scoutSpace }) => {
      const ruleName = `current-rule-state-${scoutSpace.id}-${Date.now()}`;
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId: sourceDataViewId,
        name: ruleName,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      await apiServices.alerting.rules.update(
        ruleId,
        {
          params: getUpdatedSearchSourceRuleParams(sourceDataViewId),
        },
        scoutSpace.id
      );

      await openRuleInManagement(page, ruleName);
      await page.testSubj.click('app-menu-overflow-button');
      await page.testSubj.click('ruleDetails-viewInDiscover');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await expect(page.testSubj.locator('globalToastList')).toBeHidden();
      expect(await pageObjects.queryBar.getQuery()).toBe('message:msg-1');
      expect(
        await pageObjects.filterBar.hasFilter({
          field: 'message.keyword',
          value: 'msg-1',
        })
      ).toBe(true);
      await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(SOURCE_INDEX);
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(1);
      expect(await pageObjects.discover.getCurrentDataViewId()).toBe(sourceDataViewId);
    }
  );

  spaceTest(
    'should not overwrite current data view with alert data view when starting or saving a Discover session',
    async ({ page, pageObjects, scoutSpace }) => {
      const openBaselineRuleInDiscover = async () => {
        await openRuleInManagement(page, baselineRuleName);
        await page.testSubj.click('app-menu-overflow-button');
        await page.testSubj.click('ruleDetails-viewInDiscover');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();
      };

      await openBaselineRuleInDiscover();
      await pageObjects.discover.selectDataView(OTHER_DATA_VIEW);
      await pageObjects.discover.clickNewSearch();

      expect(await pageObjects.discover.getSelectedDataViewName()).toBe(OTHER_DATA_VIEW);

      await openBaselineRuleInDiscover();
      await pageObjects.discover.selectDataView(OTHER_DATA_VIEW);
      await pageObjects.discover.saveSearch(
        `search-source-alert-session-${scoutSpace.id}-${Date.now()}`
      );

      expect(await pageObjects.discover.getSelectedDataViewName()).toBe(OTHER_DATA_VIEW);
    }
  );

  spaceTest(
    'should display prev data view state after update on clicking prev generated link',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const initialDataViewTitle = `search-source-alert-snapshot-${scoutSpace.id}-${Date.now()}`;
      await esClient.indices.putAlias({
        index: SOURCE_INDEX,
        name: initialDataViewTitle,
      });

      const dataViewResponse = await apiServices.dataViews.create({
        title: initialDataViewTitle,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      const dataViewId = dataViewResponse.data.id;
      createdDataViewIds.push(dataViewId);

      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId,
        name: `previous-data-view-state-${scoutSpace.id}-${Date.now()}`,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      const contextLink = await getGeneratedContextLink(esClient, ruleId);

      await apiServices.dataViews.update(dataViewId, {
        title: 'search-s*',
        sourceFilters: [{ value: 'message' }],
        spaceId: scoutSpace.id,
      });

      await page.goto(new URL(contextLink, page.url()).toString());
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
      expect(await pageObjects.filterBar.getFilterCount()).toBe(0);
      expect(await pageObjects.queryBar.getQuery()).toBe('');
      await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(
        initialDataViewTitle
      );
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
      await expect
        .poll(async () =>
          (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
        )
        .toBe(true);
    }
  );

  spaceTest(
    'should display actual data view state after update on clicking viewInApp link',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
      const initialDataViewTitle = `search-source-alert-current-${uniqueSuffix}`;
      const updatedDataViewTitle = `search-source-alert-updated-${uniqueSuffix}`;
      await esClient.indices.updateAliases({
        actions: [
          { add: { index: SOURCE_INDEX, alias: initialDataViewTitle } },
          { add: { index: SOURCE_INDEX, alias: updatedDataViewTitle } },
        ],
      });

      const dataViewResponse = await apiServices.dataViews.create({
        title: initialDataViewTitle,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      const dataViewId = dataViewResponse.data.id;
      createdDataViewIds.push(dataViewId);

      const ruleName = `current-data-view-state-${uniqueSuffix}`;
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId,
        name: ruleName,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

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

      await openRuleInManagement(page, ruleName);
      await page.testSubj.click('app-menu-overflow-button');
      await page.testSubj.click('ruleDetails-viewInDiscover');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await expect(page.testSubj.locator('globalToastList')).toBeHidden();
      expect(await pageObjects.queryBar.getQuery()).toBe('message:msg-1');
      expect(
        await pageObjects.filterBar.hasFilter({
          field: 'message.keyword',
          value: 'msg-1',
        })
      ).toBe(true);
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(1);
      await expect
        .poll(async () =>
          (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
        )
        .toBe(false);
      expect(await pageObjects.discover.getCurrentDataViewId()).toBe(dataViewId);

      await pageObjects.discover.getSelectedDataView().click();
      await page.testSubj.locator('indexPattern-switcher').waitFor({ state: 'visible' });
      await page.testSubj.click('indexPattern-manage-field');
      await page.testSubj.locator('indexPatternEditorFlyout').waitFor({ state: 'visible' });
      await expect(page.testSubj.locator('createIndexPatternTitleInput')).toHaveValue(
        updatedDataViewTitle
      );
    }
  );

  spaceTest(
    'should navigate to alert results via link provided in notification using adhoc data view',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const adHocDataViewId = `search-source-adhoc-${scoutSpace.id}-${Date.now()}`;
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId: adHocDataViewId,
        name: `adhoc-data-view-${scoutSpace.id}-${Date.now()}`,
        searchConfigurationIndex: getAdHocDataViewSpec(adHocDataViewId),
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      const contextLink = await getGeneratedContextLink(esClient, ruleId);
      await page.goto(new URL(contextLink, page.url()).toString());
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(
        'search-source-*'
      );
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
      await expect(pageObjects.dataGrid.getCell(0, '_source')).toContainText(
        'runtime-message-field'
      );
      await expect(pageObjects.dataGrid.getCell(0, '_source')).toContainText('mock-message');
    }
  );

  spaceTest(
    'should navigate to alert results via view in app link using adhoc data view',
    async ({ apiServices, page, pageObjects, scoutSpace }) => {
      const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
      const adHocDataViewId = `search-source-adhoc-view-${uniqueSuffix}`;
      const ruleName = `adhoc-data-view-view-${uniqueSuffix}`;
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId: adHocDataViewId,
        name: ruleName,
        searchConfigurationIndex: getAdHocDataViewSpec(adHocDataViewId),
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      await openRuleInManagement(page, ruleName);
      await page.testSubj.click('app-menu-overflow-button');
      await page.testSubj.click('ruleDetails-viewInDiscover');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await expect(page.testSubj.locator('globalToastList')).toBeHidden();
      await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(
        'search-source-*'
      );
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
      await expect(pageObjects.dataGrid.getCell(0, '_source')).toContainText(
        'runtime-message-field'
      );
      await expect(pageObjects.dataGrid.getCell(0, '_source')).toContainText('mock-message');
    }
  );

  spaceTest(
    'should display results after data view removal on clicking prev generated link',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
      const dataViewTitle = `search-source-alert-deleted-${uniqueSuffix}`;
      await esClient.indices.putAlias({
        index: SOURCE_INDEX,
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
        name: `deleted-data-view-snapshot-${uniqueSuffix}`,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      const contextLink = await getGeneratedContextLink(esClient, ruleId);
      await apiServices.dataViews.delete(dataViewId, scoutSpace.id);

      await page.goto(new URL(contextLink, page.url()).toString());
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
      expect(await pageObjects.filterBar.getFilterCount()).toBe(0);
      expect(await pageObjects.queryBar.getQuery()).toBe('');
      await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(dataViewTitle);
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
      await expect
        .poll(async () =>
          (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
        )
        .toBe(true);
    }
  );

  spaceTest(
    'should not display results after data view removal on clicking viewInApp link',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
      const dataViewTitle = `search-source-alert-missing-${uniqueSuffix}`;
      await esClient.indices.putAlias({
        index: SOURCE_INDEX,
        name: dataViewTitle,
      });

      const dataViewResponse = await apiServices.dataViews.create({
        title: dataViewTitle,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      const dataViewId = dataViewResponse.data.id;
      createdDataViewIds.push(dataViewId);

      const ruleName = `missing-data-view-current-${uniqueSuffix}`;
      const ruleId = await createSearchSourceRule({
        apiServices,
        connectorId,
        dataViewId,
        name: ruleName,
        spaceId: scoutSpace.id,
      });
      createdRuleIds.push(ruleId);

      await apiServices.dataViews.delete(dataViewId, scoutSpace.id);

      await openRuleInManagement(page, ruleName);
      await page.testSubj.click('app-menu-overflow-button');
      await page.testSubj.click('ruleDetails-viewInDiscover');

      await pageObjects.toasts.waitForToastWithText(
        `Could not locate that data view (id: ${dataViewId}), click here to re-create it`
      );
      await expect(page.testSubj.locator('docTable')).toBeHidden();
    }
  );

  spaceTest(
    'should display results after rule removal on following generated link',
    async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
      const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
      const dataViewTitle = `search-source-alert-deleted-rule-${uniqueSuffix}`;
      await esClient.indices.putAlias({
        index: SOURCE_INDEX,
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

      const contextLink = await getGeneratedContextLink(esClient, ruleId);
      await apiServices.alerting.rules.delete(ruleId, scoutSpace.id);

      await page.goto(new URL(contextLink, page.url()).toString());
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();

      await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
      expect(await pageObjects.filterBar.getFilterCount()).toBe(0);
      expect(await pageObjects.queryBar.getQuery()).toBe('');
      await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(dataViewTitle);
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
      await expect
        .poll(async () =>
          (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
        )
        .toBe(true);
    }
  );
});
