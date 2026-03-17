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
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getESQLResults } from '@kbn/esql-utils';
import { buildEsQuery } from '@kbn/es-query';
import { getTime, getEsQueryConfig } from '@kbn/data-plugin/public';
import { esqlResultToPlainObjects } from './esql_result_to_plain_objects';

export interface ExecuteEsqlParams {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  dataView: DataView;
  timeRange?: TimeRange;
  filters?: Filter[];
  variables?: ESQLControlVariable[];
  uiSettings: IUiSettingsClient;
}

/**
 * Executes an ES|QL query using the data plugin's search service.
 */
export async function executeEsqlQuery<TDocument extends object = Record<string, unknown>>({
  esqlQuery,
  search,
  signal,
  dataView,
  timeRange,
  filters = [],
  variables,
  uiSettings,
}: ExecuteEsqlParams): Promise<TDocument[]> {
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

  const { response } = await getESQLResults({
    esqlQuery,
    search,
    signal,
    filter,
    timeRange,
    variables,
  });

  const plainObjects = esqlResultToPlainObjects<TDocument>(response);

  return plainObjects;
}
