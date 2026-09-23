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
import { spaceTest, type DiscoverPageObjects } from '../../../common/ui/fixtures';

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

spaceTest.describe(
  'Discover app - search source alert',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    const createdDataViewIds: string[] = [];
    const createdRuleIds: string[] = [];
    let connectorId = '';
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
        data: { id: searchSourceAlertWildcardDataViewId },
      } = await apiServices.dataViews.create({
        title: 'search-*',
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      createdDataViewIds.push(sourceDataViewId, searchSourceAlertWildcardDataViewId);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
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

    spaceTest(
      'should validate the time field and create an alert',
      async ({ page, pageObjects }) => {
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.selectDataView(SOURCE_INDEX);
        await pageObjects.datePicker.setCommonlyUsedTime('Last_15 minutes');

        await pageObjects.discover.openSearchThresholdRuleFlyout();
        await defineSearchSourceAlert(page, `tmp-rule-${Date.now()}`);

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
        });

        await spaceTest.step('switches to a valid data view and creates the alert', async () => {
          await page.testSubj.click('selectDataViewExpression');
          const dataViewSwitcher = page.testSubj.locator('indexPattern-switcher');
          await dataViewSwitcher.waitFor({ state: 'visible' });
          await page.testSubj.locator('indexPattern-switcher--input').fill('');
          await dataViewSwitcher.locator(`[data-test-subj="dataView-${SOURCE_INDEX}"]`).click();

          await expect(page.testSubj.locator('selectDataViewExpression')).toContainText(
            SOURCE_INDEX
          );
          await expect(page.testSubj.locator('esQueryAlertExpressionError')).toBeHidden();

          await page.testSubj.click('ruleFormStep-details');
          await page.components.toast().closeAll();
          const saveButton = page.testSubj.locator('ruleFlyoutFooterSaveButton');
          await saveButton.click();
          await saveButton.waitFor({ state: 'hidden' });

          await pageObjects.toasts.waitForToastWithText('Created rule');
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

        const contextLink = await getGeneratedContextLink(esClient, ruleId);

        await apiServices.alerting.rules.update(
          ruleId,
          {
            params: getUpdatedSearchSourceRuleParams(sourceDataViewId),
          },
          scoutSpace.id
        );

        await spaceTest.step(
          'the previous notification link restores original params',
          async () => {
            await page.goto(new URL(contextLink, page.url()).toString());
            await pageObjects.discover.waitUntilSearchingHasFinished();
            await pageObjects.dataGrid.waitForDocTableRendered();

            await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
            await assertInitialResults(pageObjects, SOURCE_INDEX);
          }
        );

        await spaceTest.step('View in Discover uses current params', async () => {
          await openRuleInManagement(page, ruleName);
          await page.testSubj.click('app-menu-overflow-button');
          await page.testSubj.click('ruleDetails-viewInDiscover');
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await pageObjects.dataGrid.waitForDocTableRendered();

          await expect(page.testSubj.locator('globalToastList')).toBeHidden();
          await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(
            SOURCE_INDEX
          );
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
        await assertInitialResults(pageObjects, SOURCE_INDEX);
        expect(await pageObjects.discover.getCurrentDataViewId()).toBe(sourceDataViewId);

        await pageObjects.discover.selectDataView(OTHER_DATA_VIEW);
        await pageObjects.discover.clickNewSearch();

        expect(await pageObjects.discover.getSelectedDataViewName()).toBe(OTHER_DATA_VIEW);

        await openRuleInDiscover();
        await pageObjects.discover.selectDataView(OTHER_DATA_VIEW);
        await pageObjects.discover.saveSearch(
          `search-source-alert-session-${scoutSpace.id}-${Date.now()}`
        );

        expect(await pageObjects.discover.getSelectedDataViewName()).toBe(OTHER_DATA_VIEW);
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

        const ruleName = `updated-data-view-state-${uniqueSuffix}`;
        const ruleId = await createSearchSourceRule({
          apiServices,
          connectorId,
          dataViewId,
          name: ruleName,
          spaceId: scoutSpace.id,
        });
        createdRuleIds.push(ruleId);

        const contextLink = await getGeneratedContextLink(esClient, ruleId);

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
          searchConfigurationIndex: getAdHocDataViewSpec(adHocDataViewId),
          spaceId: scoutSpace.id,
        });
        createdRuleIds.push(ruleId);

        const contextLink = await getGeneratedContextLink(esClient, ruleId);

        const assertAdHocResults = async () => {
          await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(
            'search-source-*'
          );
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

        const ruleName = `deleted-data-view-${uniqueSuffix}`;
        const ruleId = await createSearchSourceRule({
          apiServices,
          connectorId,
          dataViewId,
          name: ruleName,
          spaceId: scoutSpace.id,
        });
        createdRuleIds.push(ruleId);

        const contextLink = await getGeneratedContextLink(esClient, ruleId);
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
        await assertInitialResults(pageObjects, dataViewTitle);
        await expect
          .poll(async () =>
            (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
          )
          .toBe(true);
      }
    );
  }
);
