/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  ApiServicesFixture,
  ScoutPage,
  ScoutSpaceParallelFixture,
  ScoutTestFixtures,
} from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DISCOVER_QUERY_MODE_KEY } from '../../../../../common/constants';
import * as testData from './constants';
import type { DiscoverPageObjects } from '.';

export type QueryMode = 'classic' | 'esql';

export const getSearchSourceRuleParams = (
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

/** Search source rule params filtered to `message:msg-1` by both query and phrase filter. */
export const getUpdatedSearchSourceRuleParams = (dataViewId: string) =>
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

/** Ad-hoc data view spec with a `runtime-message-field` runtime field. */
export const getAdHocDataViewSpec = (id: string, title: string) => ({
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

/** Re-indexes the five `msg-N` source documents ten minutes in the past so they stay inside the rule time window. */
export const refreshSearchSourceAlertDocuments = async (
  esClient: Client,
  sourceIndex: string
): Promise<void> => {
  const timestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await esClient.bulk({
    refresh: 'wait_for',
    operations: Array.from({ length: 5 }, (_, i) => [
      { index: { _index: sourceIndex, _id: `search-source-alert-${i}` } },
      { '@timestamp': timestamp, message: `msg-${i}` },
    ]).flat(),
  });
};

export interface SearchSourceAlertEnvironment {
  sourceIndex: string;
  outputIndex: string;
  connectorId: string;
  sourceDataViewId: string;
}

/** Creates the source and connector output indices, an index connector and the source data view. */
export const setupSearchSourceAlertEnvironment = async ({
  apiServices,
  esClient,
  spaceId,
}: {
  apiServices: ApiServicesFixture;
  esClient: Client;
  spaceId: string;
}): Promise<SearchSourceAlertEnvironment> => {
  const uniqueSuffix = `${spaceId}-${Date.now()}`;
  const sourceIndex = `${testData.SEARCH_SOURCE_ALERT_INDEX_PREFIX}-${uniqueSuffix}`;
  const outputIndex = `${testData.SEARCH_SOURCE_ALERT_OUTPUT_INDEX_PREFIX}-${uniqueSuffix}`;

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
  await refreshSearchSourceAlertDocuments(esClient, sourceIndex);

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

  const { id: connectorId } = await apiServices.alerting.connectors.create(
    {
      name: `search-source-alert-test-connector-${uniqueSuffix}`,
      connectorTypeId: '.index',
      config: { index: outputIndex },
      secrets: {},
    },
    spaceId
  );

  const {
    data: { id: sourceDataViewId },
  } = await apiServices.dataViews.create({
    title: sourceIndex,
    timeFieldName: '@timestamp',
    spaceId,
  });

  return { sourceIndex, outputIndex, connectorId, sourceDataViewId };
};

/** Deletes the given rules and data views plus everything created by `setupSearchSourceAlertEnvironment`. */
export const teardownSearchSourceAlertEnvironment = async ({
  apiServices,
  esClient,
  scoutSpace,
  environment,
  ruleIds,
  dataViewIds,
}: {
  apiServices: ApiServicesFixture;
  esClient: Client;
  scoutSpace: ScoutSpaceParallelFixture;
  environment: SearchSourceAlertEnvironment;
  ruleIds: readonly string[];
  dataViewIds: readonly string[];
}): Promise<void> => {
  const { sourceIndex, outputIndex, connectorId, sourceDataViewId } = environment;
  await Promise.all(
    ruleIds.map((ruleId) => apiServices.alerting.rules.delete(ruleId, scoutSpace.id))
  );
  await Promise.all(
    [sourceDataViewId, ...dataViewIds].map((dataViewId) =>
      apiServices.dataViews.delete(dataViewId, scoutSpace.id)
    )
  );
  await apiServices.alerting.connectors.delete(connectorId, scoutSpace.id);
  await esClient.indices.delete({
    index: [sourceIndex, outputIndex],
    ignore_unavailable: true,
  });
  await scoutSpace.savedObjects.cleanStandardList();
};

/** Creates an `.es-query` search source rule with an index connector action and runs it immediately. */
export const createSearchSourceRule = async ({
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
}): Promise<string> => {
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

/** Polls the connector output index until the rule writes its notification context link. */
export const getGeneratedContextLink = async (
  esClient: Client,
  outputIndex: string,
  ruleId: string
): Promise<string> => {
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

/** Asserts Discover shows the unfiltered rule results for `dataViewName`. */
export const expectSearchSourceAlertInitialResults = async (
  pageObjects: ScoutTestFixtures['pageObjects'],
  dataViewName: string
): Promise<void> => {
  expect(await pageObjects.filterBar.getFilterCount()).toBe(0);
  expect(await pageObjects.queryBar.getQuery()).toBe('');
  await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(dataViewName);
  await pageObjects.discover.getCurrentDataViewId();
  await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
};

/** Asserts Discover shows the rule results filtered by the updated `msg-1` query and filter. */
export const expectSearchSourceAlertUpdatedResults = async (
  pageObjects: ScoutTestFixtures['pageObjects'],
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

export const expectSampleSizeFooter = async ({
  pageObjects,
  sampleSize,
}: {
  pageObjects: ScoutTestFixtures['pageObjects'];
  sampleSize: number;
}) => {
  const { dataGrid } = pageObjects;

  await dataGrid.goToLastSamplePage(sampleSize, testData.DEFAULT_ROWS_PER_PAGE);
  await expect.poll(() => dataGrid.getDataGridFooterText()).toContain(String(sampleSize));
};

export const clearStoredQueryMode = async (page: ScoutPage): Promise<void> => {
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, DISCOVER_QUERY_MODE_KEY);
};

/*
 * Waits until the persisted query mode in `localStorage` equals `expectedMode` to prevent flakiness
 */
export const waitForStoredQueryMode = async (
  page: ScoutPage,
  expectedMode: QueryMode
): Promise<void> => {
  await page.waitForFunction(
    ([storageKey, mode]) => {
      const storedValue = window.localStorage.getItem(storageKey);
      if (storedValue == null) {
        return false;
      }
      try {
        return JSON.parse(storedValue)?.currentMode === mode;
      } catch {
        return false;
      }
    },
    [DISCOVER_QUERY_MODE_KEY, expectedMode] as const
  );
};

export const switchToMode = async (
  page: ScoutPage,
  pageObjects: DiscoverPageObjects,
  mode: QueryMode
): Promise<void> => {
  if (mode === 'esql') {
    await pageObjects.discover.selectTextBaseLang();
  } else {
    await pageObjects.discover.selectClassicMode();
  }

  await waitForStoredQueryMode(page, mode);
  await page.gotoApp('discover');
  await pageObjects.discover.waitUntilTabIsLoaded();
};

const getStoredQueryMode = async (page: ScoutPage): Promise<QueryMode | null> => {
  return page.evaluate((storageKey) => {
    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue == null) {
      return null;
    }
    // The app persists `{ currentMode, defaultMode }` JSON-encoded.
    try {
      const parsedMode = JSON.parse(storedValue)?.currentMode;
      return parsedMode === 'classic' || parsedMode === 'esql' ? parsedMode : null;
    } catch {
      return null;
    }
  }, DISCOVER_QUERY_MODE_KEY);
};

export const getCurrentAndStoredMode = async (
  page: ScoutPage,
  pageObjects: ScoutTestFixtures['pageObjects']
): Promise<{ currentMode: QueryMode; storedMode: QueryMode | null }> => {
  const currentMode = await pageObjects.discover.getCurrentQueryMode();
  const storedMode = await getStoredQueryMode(page);
  return { currentMode, storedMode };
};

/**
 * Submits an ES|QL query expected to trigger the cascade (grouped) layout and
 * returns whether the cascade layout actually rendered. Assertion is left to
 * the caller so it stays in the test body, not hidden inside a helper.
 */
export const runCascadeQuery = async (
  pageObjects: DiscoverPageObjects,
  query: string
): Promise<boolean> => {
  await pageObjects.discover.writeAndSubmitEsqlQuery(query);
  return pageObjects.discover.isShowingCascadeLayout();
};

/**
 * Discover page root, including the top nav. The tabs bar renders above it and
 * is scanned as a second root.
 */
const PAGE_TEST_SUBJ = '[data-test-subj="dscPage"]';
const TABS_BAR_TEST_SUBJ = '[data-test-subj="unifiedTabs_tabsBar"]';

/**
 * Left out of page-level scans, both pre-existing violations we do not own:
 *
 * - the tabs bar's tablist holds its tabs through `aria-owns` rather than as
 *   children (`aria-required-children`, `@kbn/unified-tabs`);
 * - EUI's virtualized grid body scrolls without being keyboard focusable
 *   (`scrollable-region-focusable`) whenever it overflows.
 *
 * Both are scoped to the offending node so the rest of the tabs bar and the
 * rest of the grid stay covered. The grid scroll container has no test subject
 * or role, so its EUI class is the only handle — if that class is ever renamed
 * the scan fails loudly on the violation rather than silently losing coverage.
 */
const PAGE_SCAN_EXCLUSIONS = [
  '[data-test-subj="unifiedTabs_tabsBar"] [role="tablist"]',
  '.euiDataGrid__virtualized',
];

/**
 * Runs an axe scan over the Discover page and returns the violations, so the
 * assertion stays in the test body.
 */
export const getPageA11yViolations = async (page: ScoutPage): Promise<string[]> => {
  const { violations } = await page.checkA11y({
    include: [PAGE_TEST_SUBJ, TABS_BAR_TEST_SUBJ],
    exclude: PAGE_SCAN_EXCLUSIONS,
  });
  return violations;
};
