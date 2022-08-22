/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { DataType, TermsParams } from '@kbn/visualizations-plugin/common';
import uuid from 'uuid';
import { Series } from '../../../../common/types';
import { excludeMetaFromColumn, isColumnWithMeta } from './column';
import { Column, TermsColumn } from './types';

interface OrderByWithAgg {
  orderAgg?: TermsParams['orderAgg'];
  orderBy: TermsParams['orderBy'];
}

const getOrderByWithAgg = (series: Series, columns: Column[]): OrderByWithAgg | null => {
  if (series.terms_order_by === '_key') {
    return { orderBy: { type: 'alphabetical' } };
  }

  if (series.terms_order_by === '_count') {
    const columnId = uuid();
    return {
      orderBy: { type: 'column', columnId },
      orderAgg: {
        operationType: 'count',
        sourceField: 'document',
        columnId,
        isBucketed: true,
        isSplit: false,
        dataType: 'number',
        params: {},
      },
    };
  }

  const orderAgg = columns.find((column) => {
    if (isColumnWithMeta(column)) {
      return column.meta.metricId === series.terms_order_by;
    }
    return false;
  });

  if (!orderAgg) {
    return null;
  }

  return {
    orderBy: { type: 'column', columnId: orderAgg.columnId },
    orderAgg: excludeMetaFromColumn(orderAgg),
  };
};

export const convertToTermsParams = (series: Series, columns: Column[]): TermsParams | null => {
  const orderDirection: TermsParams['orderDirection'] =
    series.terms_direction === 'asc' ? 'asc' : 'desc';

  const orderByWithAgg = getOrderByWithAgg(series, columns);
  if (orderByWithAgg === null) {
    return null;
  }

  return {
    size: series.terms_size ? Number(series.terms_size) : 10,
    ...(series.terms_include && { include: [series.terms_include] }),
    includeIsRegex: Boolean(series.terms_include),
    ...(series.terms_exclude && { exclude: [series.terms_exclude] }),
    excludeIsRegex: Boolean(series.terms_exclude),
    otherBucket: false,
    orderDirection,
    parentFormat: { id: 'terms' },
    ...orderByWithAgg,
  };
};

export const converToTermsColumn = (
  termField: string,
  series: Series,
  columns: Column[],
  dataView: DataView,
  isSplit: boolean = false
): TermsColumn | null => {
  const field = dataView.getFieldByName(termField);

  if (!field) {
    return null;
  }

  const params = convertToTermsParams(series, columns);
  if (!params) {
    return params;
  }

  return {
    columnId: uuid(),
    operationType: 'terms',
    dataType: (field.type as DataType) ?? undefined,
    sourceField: field.name,
    isBucketed: true,
    isSplit,
    params,
  };
};

export const converToTermsColumns = (
  termFields: string[],
  series: Series,
  columns: Column[],
  dataView: DataView,
  isSplit: boolean = false
): Array<TermsColumn | null> => {
  return termFields.map((field) => converToTermsColumn(field, series, columns, dataView, isSplit));
};
