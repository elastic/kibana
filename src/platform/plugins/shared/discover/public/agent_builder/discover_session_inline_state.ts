/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import type { TimeRange } from '@kbn/es-query';
import { toSearchEmbeddableByValueState } from '../../common/agent_builder/to_search_embeddable_by_value_state';
import { NEW_TAB_ID } from '../../common/constants';
import type { DiscoverAppLocatorParams } from '../../common';
import type {
  DiscoverSessionApiData,
  DiscoverSessionApiEsqlTab,
  DiscoverSessionApiTab,
} from '../../server';
import type { SearchEmbeddableInputState } from '../embeddable/types';

export const DEFAULT_DISCOVER_SESSION_TIME_RANGE: TimeRange = { from: 'now-24h', to: 'now' };

const isEsqlTab = (tab: DiscoverSessionApiTab): tab is DiscoverSessionApiEsqlTab =>
  tab.data_source.type === AS_CODE_ESQL_DATA_SOURCE_TYPE;

export const getDiscoverSessionSeedTimeRange = ({
  mappedTimeRange,
  screenContextTimeRange,
}: {
  mappedTimeRange?: TimeRange;
  screenContextTimeRange?: TimeRange;
}): TimeRange => mappedTimeRange ?? screenContextTimeRange ?? DEFAULT_DISCOVER_SESSION_TIME_RANGE;

export const buildDiscoverSessionEmbeddableInput = (
  data: DiscoverSessionApiData,
  timeRange: TimeRange
): SearchEmbeddableInputState => ({
  ...toSearchEmbeddableByValueState(data),
  time_range: timeRange,
  nonPersistedDisplayOptions: {
    enableDocumentViewer: true,
    enableFilters: false,
    documentViewerFlyoutType: 'overlay',
    autoApplyDiscoverColumnDefaults: true,
  },
});

export const getDiscoverSessionLocatorParams = ({
  data,
  timeRange,
}: {
  data: DiscoverSessionApiData;
  timeRange: TimeRange;
}): DiscoverAppLocatorParams => {
  const [tab] = data.tabs;
  const params: DiscoverAppLocatorParams = {
    timeRange,
    hideChart: true,
    columns: tab.column_order,
    sort: tab.sort?.map((entry) => [entry.name, entry.direction]),
    tab: { id: NEW_TAB_ID, label: data.title },
  };

  if (isEsqlTab(tab)) {
    params.query = { esql: tab.data_source.query };
    return params;
  }

  if (tab.data_source.type === AS_CODE_DATA_VIEW_REFERENCE_TYPE) {
    params.dataViewId = tab.data_source.ref_id;
  }

  if (tab.query) {
    params.query = {
      query: tab.query.expression,
      language: tab.query.language === 'kql' ? 'kuery' : tab.query.language,
    };
  }

  return params;
};
