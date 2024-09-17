/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { Operations } from '../../constants';
import { createColumn, getFormat } from './column';
import { SupportedMetric } from './supported_metrics';
import { CommonColumnConverterArgs, MetricsWithField } from './types';
import { SchemaConfig } from '../../../types';
import {
  AvgColumn,
  CardinalityColumn,
  CountColumn,
  MaxColumn,
  MedianColumn,
  MinColumn,
  SumColumn,
} from './types';
import { getFieldNameFromField } from '../utils';
import { isFieldValid } from '../../utils';
import { Operation } from '../../types';

type MetricAggregationWithoutParams =
  | typeof Operations.AVERAGE
  | typeof Operations.COUNT
  | typeof Operations.UNIQUE_COUNT
  | typeof Operations.COUNTER_RATE
  | typeof Operations.MAX
  | typeof Operations.MEDIAN
  | typeof Operations.MIN
  | typeof Operations.SUM;

const SUPPORTED_METRICS_AGGS_WITHOUT_PARAMS: MetricAggregationWithoutParams[] = [
  Operations.AVERAGE,
  Operations.COUNT,
  Operations.UNIQUE_COUNT,
  Operations.MAX,
  Operations.MIN,
  Operations.MEDIAN,
  Operations.SUM,
];

export type MetricAggregationColumnWithoutSpecialParams =
  | AvgColumn
  | CountColumn
  | CardinalityColumn
  | MaxColumn
  | MedianColumn
  | MinColumn
  | SumColumn;

export type MetricsWithoutSpecialParams =
  | METRIC_TYPES.AVG
  | METRIC_TYPES.COUNT
  | METRIC_TYPES.MAX
  | METRIC_TYPES.MIN
  | METRIC_TYPES.SUM
  | METRIC_TYPES.MEDIAN
  | METRIC_TYPES.CARDINALITY
  | METRIC_TYPES.VALUE_COUNT;

const isSupportedAggregationWithoutParams = (
  agg: string
): agg is MetricAggregationWithoutParams => {
  return (SUPPORTED_METRICS_AGGS_WITHOUT_PARAMS as string[]).includes(agg);
};

export const isMetricWithField = (
  agg: CommonColumnConverterArgs<METRIC_TYPES>['agg']
): agg is SchemaConfig<MetricsWithField> => {
  return agg.aggType !== METRIC_TYPES.COUNT;
};

export const convertMetricAggregationColumnWithoutSpecialParams = (
  aggregation: SupportedMetric,
  { visType, agg, dataView }: CommonColumnConverterArgs<MetricsWithoutSpecialParams>,
  reducedTimeRange?: string
): MetricAggregationColumnWithoutSpecialParams | null => {
  if (!isSupportedAggregationWithoutParams(aggregation.name)) {
    return null;
  }

  let sourceField;

  if (isMetricWithField(agg)) {
    sourceField = getFieldNameFromField(agg.aggParams?.field) ?? 'document';
  } else {
    sourceField = 'document';
  }

  const field = dataView.getFieldByName(sourceField);
  if (!isFieldValid(visType, field, aggregation)) {
    return null;
  }

  const column = createColumn(agg, field, {
    reducedTimeRange,
  });

  return {
    operationType: aggregation.name,
    sourceField,
    ...column,
    dataType: ([Operations.COUNT, Operations.UNIQUE_COUNT] as Operation[]).includes(
      aggregation.name
    )
      ? 'number'
      : column.dataType,
    params: { ...getFormat() },
    timeShift: agg.aggParams?.timeShift,
  };
};
