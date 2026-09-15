/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { type Filter, isOfAggregateQueryType } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewField, getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { hasTransformationalCommand } from '@kbn/esql-utils';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import { DataViewSource, EsqlSource, registerEsqlSourceInDataViewsCache } from '@kbn/data-source';
import type {
  UnifiedHistogramFetchParams,
  UnifiedHistogramFetchParamsExternal,
  UnifiedHistogramServices,
} from '../types';

const EMPTY_FILTERS: Filter[] = [];
const EMPTY_ESQL_VARIABLES: ESQLControlVariable[] = [];
const DEFAULT_TIME_INTERVAL = 'auto';

export interface ProcessFetchParamsResult {
  fetchParams: UnifiedHistogramFetchParams;
  /** DataView derived from dataSource. Only used for the Lens suggestions API — nowhere else. */
  lensDataView: DataView | undefined;
}

export const processFetchParams = async ({
  params,
  services,
  initialBreakdownField,
}: {
  params: UnifiedHistogramFetchParamsExternal;
  services: UnifiedHistogramServices;
  initialBreakdownField: string | undefined;
}): Promise<ProcessFetchParamsResult> => {
  const query = params.query ?? services.data.query.queryString.getDefaultQuery();
  const relativeTimeRange =
    params.relativeTimeRange ?? services.data.query.timefilter.timefilter.getTimeDefaults();
  const { dataSource } = params;

  let lensDataView: DataView | undefined;
  if (dataSource instanceof DataViewSource) {
    lensDataView = dataSource.getDataView();
  } else if (dataSource instanceof EsqlSource) {
    lensDataView = await registerEsqlSourceInDataViewsCache(services.dataViews, dataSource);
  }

  const columns = params.columns;
  const isTimeBased = dataSource.isTimeBased() && !dataSource.isRollup();
  const isESQLQuery = Boolean(query && isOfAggregateQueryType(query));
  const breakdownField = 'breakdownField' in params ? params.breakdownField : initialBreakdownField;

  const fetchParams: UnifiedHistogramFetchParams = {
    ...omit(params, 'breakdownField'),
    query,
    filters: params.filters ?? EMPTY_FILTERS,
    esqlVariables: params.esqlVariables ?? EMPTY_ESQL_VARIABLES,
    relativeTimeRange,
    timeRange: params.timeRange ?? getAbsoluteTimeRange(relativeTimeRange),
    // additional
    lastReloadRequestTime: Date.now(),
    isTimeBased,
    isESQLQuery,
    columnsMap: params.columns?.reduce<Record<string, DatatableColumn>>((acc, column) => {
      acc[column.id] = column;
      return acc;
    }, {}),
    breakdown: getProcessedBreakdownField({
      dataSource,
      query,
      columns,
      isTimeBased,
      isESQLQuery,
      breakdownField,
    }),
    timeInterval: params.timeInterval ?? DEFAULT_TIME_INTERVAL,
  };

  return { fetchParams, lensDataView };
};

function getProcessedBreakdownField({
  isTimeBased,
  isESQLQuery,
  dataSource,
  query,
  columns,
  breakdownField,
}: {
  isTimeBased: boolean;
  isESQLQuery: boolean;
  dataSource: UnifiedHistogramFetchParamsExternal['dataSource'];
  query: UnifiedHistogramFetchParams['query'];
  columns: UnifiedHistogramFetchParamsExternal['columns'];
  breakdownField: string | undefined;
}) {
  if (!isTimeBased) {
    return undefined;
  }

  // hide the breakdown field selector when the ES|QL query has a transformational command (STATS, KEEP etc)
  if (query && isOfAggregateQueryType(query) && hasTransformationalCommand(query.esql)) {
    return undefined;
  }

  if (isESQLQuery) {
    const breakdownColumn = columns?.find((column) => column.name === breakdownField);
    const field = breakdownColumn
      ? new DataViewField(convertDatatableColumnToDataViewFieldSpec(breakdownColumn))
      : undefined;
    return {
      field,
    };
  }

  const dvs = dataSource instanceof DataViewSource ? dataSource.getDataView() : undefined;
  return {
    field: breakdownField ? dvs?.getFieldByName(breakdownField) : undefined,
  };
}
