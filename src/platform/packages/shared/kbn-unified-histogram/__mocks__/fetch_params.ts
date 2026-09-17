/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewSource } from '@kbn/data-source';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { hasTransformationalCommand } from '@kbn/esql-utils';
import { DataViewField } from '@kbn/data-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import { dataViewWithTimefieldMock } from './data_view_with_timefield';
import type {
  UnifiedHistogramFetchParams,
  UnifiedHistogramFetchParamsExternal,
  UnifiedHistogramFetch$Arguments,
} from '../types';
import { ReplaySubject } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

const defaultDataSource = new DataViewSource(dataViewWithTimefieldMock);

export const getFetchParamsMock = (
  partialParams?: Partial<UnifiedHistogramFetchParamsExternal>
): UnifiedHistogramFetchParams => {
  const dataSource = (partialParams?.dataSource as DataViewSource | undefined) ?? defaultDataSource;
  const query =
    partialParams?.query !== undefined ? partialParams.query : { language: 'kuery', query: '' };
  const columns = partialParams?.columns;
  const isESQLQuery = Boolean(query && isOfAggregateQueryType(query));
  const isTimeBased = dataSource.isTimeBased() && !dataSource.isRollup();
  const breakdownFieldName =
    partialParams && 'breakdownField' in partialParams ? partialParams.breakdownField : undefined;

  let breakdown: UnifiedHistogramFetchParams['breakdown'];
  if (isTimeBased) {
    if (isESQLQuery && isOfAggregateQueryType(query) && hasTransformationalCommand(query.esql)) {
      breakdown = undefined;
    } else if (isESQLQuery) {
      const breakdownColumn = columns?.find((col) => col.name === breakdownFieldName);
      breakdown = {
        field: breakdownColumn
          ? new DataViewField(convertDatatableColumnToDataViewFieldSpec(breakdownColumn))
          : undefined,
      };
    } else {
      const dv = dataSource instanceof DataViewSource ? dataSource.getDataView() : undefined;
      breakdown = {
        field: breakdownFieldName ? dv?.getFieldByName(breakdownFieldName) : undefined,
      };
    }
  }

  // Exclude fields we compute ourselves so there are no duplicate keys in the literal
  const { query: _q, dataSource: _ds, breakdownField: _bf, ...restParams } = partialParams ?? {};

  return {
    dataSource,
    searchSessionId: 'id',
    query,
    filters: [],
    timeRange: { from: '2025-10-07T22:00:00.000Z', to: '2025-11-07T15:56:36.264Z' },
    relativeTimeRange: { from: 'now-30d/d', to: 'now' },
    requestAdapter: new RequestAdapter(),
    esqlVariables: [],
    lastReloadRequestTime: Date.now(),
    isESQLQuery,
    isTimeBased,
    columnsMap: undefined,
    breakdown,
    timeInterval: 'auto',
    ...restParams,
  };
};

export const getFetch$Mock = (
  fetchParams?: UnifiedHistogramFetch$Arguments['fetchParams'],
  lensVisServiceState?: UnifiedHistogramFetch$Arguments['lensVisServiceState']
) => {
  const fetch$ = new ReplaySubject<UnifiedHistogramFetch$Arguments>(1);
  if (fetchParams) {
    fetch$.next({ fetchParams, lensVisServiceState });
  }
  return fetch$;
};
