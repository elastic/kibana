/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { DataType, TermsParams } from '@kbn/visualizations-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import { excludeMetaFromColumn, getFormat, isColumnWithMeta } from './column';
import { Column, TermsColumn, TermsSeries } from './types';

interface OrderByWithAgg {
  orderAgg?: TermsParams['orderAgg'];
  orderBy: TermsParams['orderBy'];
}

const getOrderByWithAgg = (series: TermsSeries, columns: Column[]): OrderByWithAgg | null => {
  if (series.terms_order_by === '_key') {
    return { orderBy: { type: 'alphabetical' } };
  }

  if (series.terms_order_by === '_count' || !series.terms_order_by) {
    return {
      orderBy: { type: 'custom' },
      orderAgg: {
        operationType: 'count',
        sourceField: 'document',
        columnId: uuidv4(),
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

export const convertToTermsParams = (
  series: TermsSeries,
  columns: Column[],
  secondaryFields: string[]
): TermsParams | null => {
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
    secondaryFields,
  };
};

export const convertToTermsColumn = (
  termFields: [string, ...string[]],
  series: TermsSeries,
  columns: Column[],
  dataView: DataView,
  isSplit: boolean = false,
  label?: string
): TermsColumn | null => {
  const [baseField, ...secondaryFields] = termFields;
  const field = dataView.getFieldByName(baseField);

  if (!field) {
    return null;
  }

  const params = convertToTermsParams(series, columns, secondaryFields);
  if (!params) {
    return null;
  }

  return {
    columnId: uuidv4(),
    operationType: 'terms',
    dataType: (field.type as DataType) ?? undefined,
    sourceField: field.name,
    isBucketed: true,
    isSplit,
    label,
    params: { ...params, ...getFormat(series) },
  };
};
