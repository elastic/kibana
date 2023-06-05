/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BUCKET_TYPES } from '@kbn/data-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import { DataType, TermsParams } from '../../types';
import { getFieldNameFromField, isColumnWithMeta } from '../utils';
import { convertToSchemaConfig } from '../../../vis_schemas';
import { convertMetricToColumns } from '../metrics';
import { CommonBucketConverterArgs, TermsColumn } from './types';
import { filterOutEmptyValues } from './terms';

export const convertToSignificantTermsParams = ({
  agg,
  dataView,
  aggs,
  metricColumns,
  visType,
}: CommonBucketConverterArgs<BUCKET_TYPES.SIGNIFICANT_TERMS>): TermsParams | null => {
  if (!agg.aggParams) {
    return null;
  }

  const exclude = agg.aggParams.exclude ? filterOutEmptyValues(agg.aggParams.exclude) : [];
  const include = agg.aggParams.include ? filterOutEmptyValues(agg.aggParams.include) : [];
  return {
    size: agg.aggParams.size ?? 10,
    include,
    exclude,
    orderBy: { type: 'significant' },
  };
};

export const convertToSignificantTermsColumn = (
  aggId: string,
  { agg, dataView, aggs, metricColumns, visType }: CommonBucketConverterArgs<BUCKET_TYPES.TERMS>,
  label: string,
  isSplit: boolean
): TermsColumn | null => {
  if (!agg.aggParams?.field) {
    return null;
  }
  const sourceField = getFieldNameFromField(agg.aggParams?.field) ?? 'document';
  const field = dataView.getFieldByName(sourceField);

  if (!field) {
    return null;
  }

  const params = convertToSignificantTermsParams({ agg, dataView, aggs, metricColumns, visType });
  if (!params) {
    return null;
  }

  return {
    columnId: uuidv4(),
    operationType: 'terms',
    label,
    dataType: (field.type as DataType) ?? undefined,
    sourceField: field.name,
    isBucketed: true,
    isSplit,
    params: { ...params },
    timeShift: agg.aggParams?.timeShift,
    meta: { aggId },
  };
};
