/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { AggParamsTerms, METRIC_TYPES } from '@kbn/data-plugin/common';
import uuid from 'uuid';
import { Column, DataType, TermsColumn, TermsParams } from '../../types';
import { getFieldNameFromField, isColumnWithMeta } from '../utils';
import { convertMetricToColumns } from '../metrics';

interface OrderByWithAgg {
  orderAgg?: TermsParams['orderAgg'];
  orderBy: TermsParams['orderBy'];
}

const getOrderByWithAgg = (
  aggParams: AggParamsTerms,
  dataView: DataView,
  metricColumns: Column[]
): OrderByWithAgg | null => {
  if (aggParams.orderBy === '_key') {
    return { orderBy: { type: 'alphabetical' } };
  }

  if (aggParams.orderBy === 'custom') {
    const aggType = aggParams.orderAgg?.type.dslName as METRIC_TYPES;
    let orderAggParams = aggParams.orderAgg?.serialize().params;
    if (aggType === METRIC_TYPES.PERCENTILES && orderAggParams) {
      orderAggParams = {
        ...orderAggParams,
        percent: [(orderAggParams as { percentile: number }).percentile],
      };
    } else if (aggType === METRIC_TYPES.PERCENTILE_RANKS && orderAggParams) {
      orderAggParams = { ...orderAggParams, values: [(orderAggParams as { value: number }).value] };
    }
    const orderMetricColumn = convertMetricToColumns(
      {
        aggType,
        label: aggParams.orderAgg?.makeLabel(),
        aggParams: orderAggParams,
        params: {},
        format: aggParams.orderAgg?.toSerializedFieldFormat() ?? {},
        accessor: 0,
      },
      dataView
    );
    if (!orderMetricColumn) {
      return null;
    }
    return {
      orderBy: { type: 'column', columnId: orderMetricColumn[0].columnId },
      orderAgg: orderMetricColumn[0],
    };
  }

  const orderAgg = metricColumns.find((column) => {
    if (isColumnWithMeta(column)) {
      return column.meta.aggId.split('.')[1] === aggParams.orderBy;
    }
    return false;
  });

  if (!orderAgg) {
    return null;
  }

  return {
    orderBy: { type: 'column', columnId: orderAgg.columnId },
    orderAgg,
  };
};

export const convertToTermsParams = (
  aggParams: AggParamsTerms,
  dataView: DataView,
  metricColumns: Column[]
): TermsParams | null => {
  const orderByWithAgg = getOrderByWithAgg(aggParams, dataView, metricColumns);
  if (orderByWithAgg === null) {
    return null;
  }

  return {
    size: aggParams.size ?? 10,
    include: aggParams.include ?? [],
    includeIsRegex: aggParams.includeIsRegex,
    exclude: aggParams.exclude ?? [],
    excludeIsRegex: aggParams.excludeIsRegex,
    otherBucket: aggParams.otherBucket,
    orderDirection: aggParams.order?.value ?? 'desc',
    parentFormat: { id: 'terms' },
    ...orderByWithAgg,
  };
};

export const convertToTermsColumn = (
  aggParams: AggParamsTerms,
  label: string,
  dataView: DataView,
  isSplit: boolean,
  metricColumns: Column[]
): TermsColumn | null => {
  if (!aggParams?.field) {
    return null;
  }
  const sourceField = getFieldNameFromField(aggParams?.field) ?? 'document';
  const field = dataView.getFieldByName(sourceField);

  if (!field) {
    return null;
  }

  const params = convertToTermsParams(aggParams, dataView, metricColumns);
  if (!params) {
    return null;
  }

  return {
    columnId: uuid(),
    operationType: 'terms',
    label,
    dataType: (field.type as DataType) ?? undefined,
    sourceField: field.name,
    isBucketed: true,
    isSplit,
    params: { ...params },
    timeShift: aggParams?.timeShift,
  };
};
