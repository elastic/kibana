/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BUCKET_TYPES } from '@kbn/data-plugin/common';
import uuid from 'uuid';
import { DataType, TermsParams } from '../../types';
import { getFieldNameFromField, isColumnWithMeta } from '../utils';
import { convertToSchemaConfig } from '../../../vis_schemas';
import { convertMetricToColumns } from '../metrics';
import { CommonBucketConverterArgs, TermsColumn } from './types';

interface OrderByWithAgg {
  orderAgg?: TermsParams['orderAgg'];
  orderBy: TermsParams['orderBy'];
}

const getOrderByWithAgg = ({
  aggParams,
  dataView,
  aggs,
  metricColumns,
}: CommonBucketConverterArgs<BUCKET_TYPES.TERMS>): OrderByWithAgg | null => {
  if (aggParams.orderBy === '_key') {
    return { orderBy: { type: 'alphabetical' } };
  }

  if (aggParams.orderBy === 'custom') {
    if (!aggParams.orderAgg) {
      return null;
    }
    const orderMetricColumn = convertMetricToColumns(
      convertToSchemaConfig(aggParams.orderAgg),
      dataView,
      aggs
    );
    if (!orderMetricColumn) {
      return null;
    }
    return {
      orderBy: { type: 'custom' },
      orderAgg: orderMetricColumn[0],
    };
  }

  const orderAgg = metricColumns.find((column) => {
    if (isColumnWithMeta(column)) {
      return column.meta.aggId === aggParams.orderBy;
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

export const convertToTermsParams = ({
  aggParams,
  dataView,
  aggs,
  metricColumns,
}: CommonBucketConverterArgs<BUCKET_TYPES.TERMS>): TermsParams | null => {
  const orderByWithAgg = getOrderByWithAgg({ aggParams, dataView, aggs, metricColumns });
  if (orderByWithAgg === null) {
    return null;
  }

  return {
    size: aggParams.size ?? 10,
    include: aggParams.include
      ? Array.isArray(aggParams.include)
        ? aggParams.include
        : [aggParams.include]
      : [],
    includeIsRegex: aggParams.includeIsRegex,
    exclude: aggParams.exclude
      ? Array.isArray(aggParams.exclude)
        ? aggParams.exclude
        : [aggParams.exclude]
      : [],
    excludeIsRegex: aggParams.excludeIsRegex,
    otherBucket: aggParams.otherBucket,
    orderDirection: aggParams.order?.value ?? 'desc',
    parentFormat: { id: 'terms' },
    missingBucket: aggParams.missingBucket,
    ...orderByWithAgg,
  };
};

export const convertToTermsColumn = (
  aggId: string,
  { aggParams, dataView, aggs, metricColumns }: CommonBucketConverterArgs<BUCKET_TYPES.TERMS>,
  label: string,
  isSplit: boolean
): TermsColumn | null => {
  if (!aggParams?.field) {
    return null;
  }
  const sourceField = getFieldNameFromField(aggParams?.field) ?? 'document';
  const field = dataView.getFieldByName(sourceField);

  if (!field) {
    return null;
  }

  const params = convertToTermsParams({ aggParams, dataView, aggs, metricColumns });
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
    meta: { aggId },
  };
};
