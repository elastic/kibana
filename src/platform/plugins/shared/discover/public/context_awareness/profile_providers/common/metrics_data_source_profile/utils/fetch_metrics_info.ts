/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getESQLResults } from '@kbn/esql-utils';
import { buildEsQuery } from '@kbn/es-query';
import { getTime, getEsQueryConfig } from '@kbn/data-plugin/public';

export interface MetricsInfoFetchFailedPayload {
  esqlQuery: string;
  dataViewId?: string;
  errorMessage?: string;
}

export interface FetchMetricsInfoParams {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  dataView: DataView;
  timeRange?: TimeRange;
  filters?: Filter[];
  variables?: ESQLControlVariable[];
  uiSettings: IUiSettingsClient;
  onFetchFailed?: (payload: MetricsInfoFetchFailedPayload) => void;
}

/**
 * Fetches METRICS_INFO result by running the given ES|QL query (expected to end with | METRICS_INFO).
 * Applies the same time range and filter semantics as the main Discover ES|QL request.
 */
export async function fetchMetricsInfo({
  esqlQuery,
  search,
  signal,
  dataView,
  timeRange,
  filters = [],
  variables,
  uiSettings,
  onFetchFailed,
}: FetchMetricsInfoParams): Promise<ESQLSearchResponse> {
  const esQueryConfig = getEsQueryConfig(uiSettings);
  const timeFilter =
    timeRange && dataView?.timeFieldName
      ? getTime(dataView, timeRange, { fieldName: dataView.timeFieldName })
      : undefined;
  const filtersWithTime = [...(timeFilter ? [timeFilter] : []), ...filters];
  const filter =
    filtersWithTime.length > 0
      ? buildEsQuery(undefined, [], filtersWithTime, esQueryConfig)
      : undefined;

  try {
    const { response } = await getESQLResults({
      esqlQuery,
      search,
      signal,
      filter,
      timeRange,
      variables,
    });
    return response;
  } catch (error) {
    onFetchFailed?.({
      esqlQuery,
      dataViewId: dataView?.id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
