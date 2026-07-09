/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiServicesFixture, ScoutTestFixtures } from '@kbn/scout';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import { AD_HOC_TAB, ESQL_TAB, PERSISTED_TAB } from './discover_session_test_data';

const LOGSTASH_DATA_VIEW_REFERENCE = 'kibanaSavedObjectMeta.searchSourceJSON.index';
const AD_HOC_DATA_VIEW_ID = 'multi-tab-ad-hoc-data-view';

const toSavedObjectTimeRange = ({ start, end }: { start: string; end: string }) => ({
  from: start,
  to: end,
});

const createClassicTabAttributes = ({
  columns,
  query,
  timeRange,
  dataView = LOGSTASH_DATA_VIEW_REFERENCE,
  chartInterval,
}: {
  columns: string[];
  query: string;
  timeRange: { from: string; to: string };
  dataView?: string | Record<string, unknown>;
  chartInterval?: string;
}): DiscoverSessionTabAttributes => ({
  columns,
  sort: [['@timestamp', 'desc']],
  grid: {},
  hideChart: false,
  hideTable: false,
  isTextBasedQuery: false,
  timeRestore: true,
  timeRange,
  chartInterval,
  kibanaSavedObjectMeta: {
    searchSourceJSON: JSON.stringify({
      query: { query, language: 'kuery' },
      filter: [],
      index: dataView,
    }),
  },
});

const createAdHocDataViewSpec = () => ({
  id: AD_HOC_DATA_VIEW_ID,
  title: 'logs*',
  name: AD_HOC_TAB.dataView,
  timeFieldName: '@timestamp',
});

const createMultiTabDiscoverSessionTabs = () => [
  {
    id: 'persisted-data-view-tab',
    label: PERSISTED_TAB.label,
    attributes: createClassicTabAttributes({
      columns: [PERSISTED_TAB.column1],
      query: PERSISTED_TAB.query,
      timeRange: toSavedObjectTimeRange(PERSISTED_TAB.timeISO),
      chartInterval: PERSISTED_TAB.chartIntervalValue,
    }),
  },
  {
    id: 'ad-hoc-data-view-tab',
    label: AD_HOC_TAB.label,
    attributes: {
      ...createClassicTabAttributes({
        columns: [AD_HOC_TAB.column1],
        query: AD_HOC_TAB.query,
        timeRange: toSavedObjectTimeRange(AD_HOC_TAB.timeISO),
        dataView: createAdHocDataViewSpec(),
      }),
      usesAdHocDataView: true,
    },
  },
  {
    id: 'esql-tab',
    label: ESQL_TAB.label,
    attributes: {
      columns: [],
      sort: [['@timestamp', 'desc']],
      grid: {},
      hideChart: false,
      hideTable: false,
      isTextBasedQuery: true,
      timeRestore: true,
      timeRange: toSavedObjectTimeRange(ESQL_TAB.timeISO),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { esql: ESQL_TAB.query },
          filter: [],
        }),
      },
      visContext: {
        suggestionType: 'histogramForESQL',
        requestData: {},
        attributes: {
          visualizationType: 'lnsXY',
          state: { visualization: { preferredSeriesType: 'line' } },
        },
      },
    } satisfies DiscoverSessionTabAttributes,
  },
];

/**
 * Builds a three-tab Discover session (persisted data view, ad hoc data view,
 * and ES|QL) without saving. Kept as a single source of truth so the "saving"
 * test and the load/unsaved-changes setup share the exact same tab sequence.
 */
export const buildMultiTabSession = async (pageObjects: ScoutTestFixtures['pageObjects']) => {
  const { discover, datePicker, queryBar, unifiedTabs, unifiedFieldList } = pageObjects;

  await datePicker.setAbsoluteRange(PERSISTED_TAB.time);
  await queryBar.setQuery(PERSISTED_TAB.query);
  await discover.submitQuery();
  await discover.waitUntilTabIsLoaded();
  await unifiedFieldList.clickFieldListItemAdd(PERSISTED_TAB.column1);
  await unifiedTabs.editTabLabel(0, PERSISTED_TAB.label);
  await discover.setChartInterval(PERSISTED_TAB.chartIntervalTitle);

  await unifiedTabs.createNewTab();
  await discover.waitUntilTabIsLoaded();
  await datePicker.setAbsoluteRange(AD_HOC_TAB.time);
  await discover.createDataViewFromSearchBar({ name: 'logs', adHoc: true });
  await discover.waitUntilTabIsLoaded();
  await queryBar.setQuery(AD_HOC_TAB.query);
  await discover.submitQuery();
  await discover.waitUntilTabIsLoaded();
  await unifiedFieldList.clickFieldListItemAdd(AD_HOC_TAB.column1);
  await unifiedTabs.editTabLabel(1, AD_HOC_TAB.label);

  await unifiedTabs.createNewTab();
  await discover.waitUntilTabIsLoaded();
  await datePicker.setAbsoluteRange(ESQL_TAB.time);
  await discover.writeAndSubmitEsqlQuery(ESQL_TAB.query);
  await discover.changeHistogramVisShape(ESQL_TAB.visShape);
  await unifiedTabs.editTabLabel(2, ESQL_TAB.label);
};

export const createMultiTabDiscoverSessionViaApi = async ({
  apiServices,
  sessionName,
  spaceId,
}: {
  apiServices: ApiServicesFixture;
  sessionName: string;
  spaceId: string;
}) => {
  await apiServices.savedObjects.create({
    type: 'search',
    spaceId,
    attributes: {
      title: sessionName,
      description: '',
      tabs: createMultiTabDiscoverSessionTabs(),
    },
    initialNamespaces: [spaceId],
    references: [
      {
        id: PERSISTED_TAB.dataView,
        name: LOGSTASH_DATA_VIEW_REFERENCE,
        type: 'index-pattern',
      },
    ],
  });
};
