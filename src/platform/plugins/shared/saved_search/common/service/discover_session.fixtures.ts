/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataGridDensity, DiscoverTabType, VIEW_MODE } from '@kbn/discover-session-constants';
import type { DiscoverSession, DiscoverSessionTab } from '../types';
import type { StoredDiscoverSession } from './discover_session_serialization';

// Tab settings that the stored format keeps unchanged. Each tab sets different ones.
const savedViewTabSettings = {
  columns: ['message'],
  grid: { columns: { message: { width: 320 } } },
  viewMode: VIEW_MODE.PATTERN_LEVEL,
  hideAggregatedPreview: true,
  rowHeight: 3,
  headerRowHeight: 2,
  rowsPerPage: 25,
  sampleSize: 500,
  breakdownField: 'host.name',
  chartInterval: 'h',
  density: DataGridDensity.EXPANDED,
  documentsDisplayMode: 'json',
  jsonModeSettings: { hideNulls: true, wrapLines: false, defaultRenderedNodes: 50 },
  refreshInterval: { pause: false, value: 60000 },
  visContext: {
    suggestionType: 'histogramForDataView',
    requestData: {
      dataViewId: 'saved-view-id',
      timeField: '@timestamp',
      timeInterval: 'h',
      breakdownField: 'host.name',
    },
    attributes: { title: 'Histogram' },
  },
} satisfies Partial<DiscoverSessionTab>;

const inlineViewTabSettings = {
  columns: [],
  grid: {},
  timeRestore: true,
  timeRange: { from: 'now-15m', to: 'now' },
} satisfies Partial<DiscoverSessionTab>;

const esqlTabSettings = {
  columns: ['host.name'],
  grid: {},
  esqlApproximation: true,
  controlGroupJson: JSON.stringify({
    'host-control': { order: 0, type: 'esqlControl', variableName: 'host' },
  }),
  tabTypeState: {
    type: DiscoverTabType.Metrics,
    dimensions: ['host.name'],
    searchTerm: 'bytes',
    counterAggregation: 'sum',
    gaugeAggregation: 'avg',
    histogramPercentile: 'p95',
  },
} satisfies Partial<DiscoverSessionTab>;

const esqlSearchSource = {
  query: { esql: 'TS metrics-* | STATS avg(bytes) BY host.name' },
  index: { id: 'esql-view-id', title: 'metrics-*', type: 'esql' },
};

/** A session with saved, inline and ES|QL Data View tabs, using every stored tab setting. */
export const discoverSession: Pick<DiscoverSession, 'title' | 'description' | 'tabs'> = {
  title: 'Stored session',
  description: 'Session description',
  tabs: [
    {
      id: 'saved-view-tab',
      label: 'Saved view',
      sort: [['@timestamp', 'desc']],
      hideChart: false,
      hideTable: false,
      isTextBasedQuery: false,
      usesAdHocDataView: false,
      serializedSearchSource: {
        query: { query: 'status:200', language: 'kuery' },
        filter: [{ meta: { index: 'saved-view-id' }, query: { match_phrase: { status: 200 } } }],
        index: 'saved-view-id',
      },
      ...savedViewTabSettings,
    },
    {
      id: 'inline-view-tab',
      label: 'Inline view',
      sort: [],
      hideChart: true,
      hideTable: false,
      isTextBasedQuery: false,
      usesAdHocDataView: true,
      serializedSearchSource: {
        index: { id: 'inline-view-id', title: 'logs-*', timeFieldName: '@timestamp' },
        filter: [{ meta: { index: 'inline-view-id' }, query: { exists: { field: 'host.name' } } }],
      },
      ...inlineViewTabSettings,
    },
    {
      id: 'esql-tab',
      label: 'Metrics',
      sort: [],
      hideChart: false,
      hideTable: true,
      isTextBasedQuery: true,
      usesAdHocDataView: false,
      serializedSearchSource: esqlSearchSource,
      ...esqlTabSettings,
    },
  ],
};

/** The stored form of `discoverSession`: filter and saved Data View IDs become references. */
export const storedDiscoverSession: StoredDiscoverSession = {
  attributes: {
    title: 'Stored session',
    description: 'Session description',
    tabs: [
      {
        id: 'saved-view-tab',
        label: 'Saved view',
        attributes: {
          sort: [['@timestamp', 'desc']],
          hideChart: false,
          hideTable: false,
          isTextBasedQuery: false,
          usesAdHocDataView: false,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              query: { query: 'status:200', language: 'kuery' },
              filter: [
                {
                  meta: {
                    indexRefName:
                      'tab_saved-view-tab.kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                  },
                  query: { match_phrase: { status: 200 } },
                },
              ],
              indexRefName: 'tab_saved-view-tab.kibanaSavedObjectMeta.searchSourceJSON.index',
            }),
          },
          ...savedViewTabSettings,
        },
      },
      {
        id: 'inline-view-tab',
        label: 'Inline view',
        attributes: {
          sort: [],
          hideChart: true,
          hideTable: false,
          isTextBasedQuery: false,
          usesAdHocDataView: true,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              index: { id: 'inline-view-id', title: 'logs-*', timeFieldName: '@timestamp' },
              filter: [
                {
                  meta: {
                    indexRefName:
                      'tab_inline-view-tab.kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                  },
                  query: { exists: { field: 'host.name' } },
                },
              ],
            }),
          },
          ...inlineViewTabSettings,
        },
      },
      {
        id: 'esql-tab',
        label: 'Metrics',
        attributes: {
          sort: [],
          hideChart: false,
          hideTable: true,
          isTextBasedQuery: true,
          usesAdHocDataView: false,
          kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify(esqlSearchSource) },
          ...esqlTabSettings,
        },
      },
    ],
  },
  references: [
    {
      name: 'tab_saved-view-tab.kibanaSavedObjectMeta.searchSourceJSON.index',
      type: 'index-pattern',
      id: 'saved-view-id',
    },
    {
      name: 'tab_saved-view-tab.kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
      type: 'index-pattern',
      id: 'saved-view-id',
    },
    {
      name: 'tab_inline-view-tab.kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
      type: 'index-pattern',
      id: 'inline-view-id',
    },
  ],
};
