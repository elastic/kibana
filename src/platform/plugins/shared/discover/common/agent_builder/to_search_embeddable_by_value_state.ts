/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
import type {
  DiscoverSessionApiEsqlTab,
  DiscoverSessionApiTab,
} from '@kbn/as-code-discover-schema';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionApiData, DiscoverSessionEmbeddableByValueState } from '../../server';

/**
 * Projects Discover session API data into as-code by-value search embeddable state.
 * Extra session tabs are ignored: embeddable by-value currently supports one tab.
 */
export const toSearchEmbeddableByValueState = (
  data: DiscoverSessionApiData
): DiscoverSessionEmbeddableByValueState => {
  const [tab] = data.tabs;
  const state: DiscoverSessionEmbeddableByValueState = {
    title: data.title,
    tabs: [toEmbeddableTab(tab)],
  };

  if (data.description) {
    state.description = data.description;
  }

  // Chat has no global timefilter, so copy the tab time range onto the panel.
  if (tab.time_range) {
    state.time_range = tab.time_range;
  }

  return state;
};

const isApiEsqlTab = (tab: DiscoverSessionApiTab): tab is DiscoverSessionApiEsqlTab => {
  return tab.data_source.type === AS_CODE_ESQL_DATA_SOURCE_TYPE;
};

const toTableFields = (tab: DiscoverSessionApiTab) => ({
  sort: tab.sort ?? [],
  ...(tab.column_order !== undefined ? { column_order: tab.column_order } : {}),
  ...(tab.column_settings !== undefined ? { column_settings: tab.column_settings } : {}),
  ...(tab.density !== undefined ? { density: tab.density } : {}),
  ...(tab.header_row_height !== undefined ? { header_row_height: tab.header_row_height } : {}),
  ...(tab.row_height !== undefined ? { row_height: tab.row_height } : {}),
  ...(tab.rows_per_page !== undefined ? { rows_per_page: tab.rows_per_page } : {}),
  ...(tab.sample_size !== undefined ? { sample_size: tab.sample_size } : {}),
});

const toEmbeddableTab = (
  tab: DiscoverSessionApiTab
): DiscoverSessionEmbeddableByValueState['tabs'][number] => {
  if (isApiEsqlTab(tab)) {
    const esqlTab = {
      ...toTableFields(tab),
      data_source: tab.data_source,
      type: DiscoverTabType.Default as const,
    };

    if (tab.type === DiscoverTabType.Metrics) {
      return {
        ...esqlTab,
        type: tab.type,
        dimensions: tab.dimensions,
        search_term: tab.search_term,
        counter_aggregation: tab.counter_aggregation,
        gauge_aggregation: tab.gauge_aggregation,
        histogram_percentile: tab.histogram_percentile,
      };
    }

    return esqlTab;
  }

  const classicTab = {
    ...toTableFields(tab),
    data_source: tab.data_source,
    type: DiscoverTabType.Default as const,
    filters: tab.filters ?? [],
    view_mode: tab.view_mode ?? VIEW_MODE.DOCUMENT_LEVEL,
    ...(tab.query !== undefined ? { query: tab.query } : {}),
  };
  return classicTab;
};
