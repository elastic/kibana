/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../..';
import { LastValueParams } from '../../types';
import { isFieldValid } from '../../utils';
import { getFieldNameFromField } from '../utils';
import { createColumn, getFormat } from './column';
import { SUPPORTED_METRICS } from './supported_metrics';
import { CommonColumnConverterArgs, LastValueColumn } from './types';

const convertToLastValueParams = (
  agg: SchemaConfig<METRIC_TYPES.TOP_HITS | METRIC_TYPES.TOP_METRICS>
): LastValueParams => {
  return {
    sortField: agg.aggParams!.sortField!.name,
    showArrayValues: agg.aggType === METRIC_TYPES.TOP_HITS,
  };
};

export const convertToLastValueColumn = (
  {
    visType,
    agg,
    dataView,
  }: CommonColumnConverterArgs<METRIC_TYPES.TOP_HITS | METRIC_TYPES.TOP_METRICS>,
  reducedTimeRange?: string
): LastValueColumn | null => {
  const { aggParams } = agg;

  if (
    (aggParams?.size && Number(aggParams?.size) !== 1) ||
    aggParams?.sortOrder?.value !== 'desc'
  ) {
    return null;
  }

  const fieldName = getFieldNameFromField(agg.aggParams!.field);
  if (!fieldName) {
    return null;
  }

  const field = dataView.getFieldByName(fieldName);
  if (!isFieldValid(visType, field, SUPPORTED_METRICS[agg.aggType])) {
    return null;
  }

  if (!agg.aggParams?.sortField) {
    return null;
  }

  return {
    operationType: 'last_value',
    sourceField: field.name ?? 'document',
    ...createColumn(agg, field, { reducedTimeRange }),
    params: {
      ...convertToLastValueParams(agg),
      ...getFormat(),
    },
  };
};
