/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Filter, isOfAggregateQueryType } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type {
  UnifiedHistogramFetchParams,
  UnifiedHistogramFetchParamsExternal,
  UnifiedHistogramServices,
} from '../types';

const EMPTY_FILTERS: Filter[] = [];
const EMPTY_ESQL_VARIABLES: ESQLControlVariable[] = [];

export const processFetchParams = ({
  params,
  services,
}: {
  params: UnifiedHistogramFetchParamsExternal;
  services: UnifiedHistogramServices;
}): UnifiedHistogramFetchParams => {
  const query = params.query ?? services.data.query.queryString.getDefaultQuery();
  const relativeTimeRange =
    params.timeRange ?? services.data.query.timefilter.timefilter.getTimeDefaults();

  return {
    ...params,
    query,
    filters: params.filters ?? EMPTY_FILTERS,
    esqlVariables: params.esqlVariables ?? EMPTY_ESQL_VARIABLES,
    relativeTimeRange,
    timeRange: getAbsoluteTimeRange(relativeTimeRange),
    // additional
    triggeredAt: Date.now(),
    isESQLQuery: Boolean(query && isOfAggregateQueryType(query)),
    columnsMap: params.columns?.reduce<Record<string, DatatableColumn>>((acc, column) => {
      acc[column.id] = column;
      return acc;
    }, {}),
  };
};
