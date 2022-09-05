/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { Operations } from '../../constants';
import { createColumn, createColumnFromCustomAgg } from './column';
import { SupportedMetric } from './supported_metrics';
import { CommonColumnConverterArgs, MetricsWithField } from './types';
import { SchemaConfig } from '../../../types';
import {
  AvgColumn,
  CardinalityColumn,
  CountColumn,
  MaxColumn,
  MinColumn,
  SumColumn,
} from '../../types';

type MetricAggregationWithoutParams =
  | typeof Operations.AVERAGE
  | typeof Operations.COUNT
  | typeof Operations.UNIQUE_COUNT
  | typeof Operations.COUNTER_RATE
  | typeof Operations.MAX
  | typeof Operations.MIN
  | typeof Operations.SUM
  | typeof Operations.STANDARD_DEVIATION;

const SUPPORTED_METRICS_AGGS_WITHOUT_PARAMS: MetricAggregationWithoutParams[] = [
  Operations.AVERAGE,
  Operations.COUNT,
  Operations.UNIQUE_COUNT,
  Operations.MAX,
  Operations.MIN,
  Operations.SUM,
  Operations.STANDARD_DEVIATION,
];

export type MetricAggregationColumnWithoutSpecialParams =
  | AvgColumn
  | CountColumn
  | CardinalityColumn
  | MaxColumn
  | MinColumn
  | SumColumn;

type MetricsWithoutSpecialParams =
  | METRIC_TYPES.AVG
  | METRIC_TYPES.COUNT
  | METRIC_TYPES.MAX
  | METRIC_TYPES.MIN
  | METRIC_TYPES.SUM
  | METRIC_TYPES.CARDINALITY;

const isSupportedAggregationWithoutParams = (
  agg: string
): agg is MetricAggregationWithoutParams => {
  return (SUPPORTED_METRICS_AGGS_WITHOUT_PARAMS as string[]).includes(agg);
};

const isMetricWithField = (
  agg: CommonColumnConverterArgs<MetricsWithField | METRIC_TYPES.COUNT>['agg']
): agg is SchemaConfig<MetricsWithField> => {
  return agg.aggType !== METRIC_TYPES.COUNT;
};

export const convertMetricAggregationColumnWithoutSpecialParams = (
  aggregation: SupportedMetric,
  { agg, dataView }: CommonColumnConverterArgs<MetricsWithoutSpecialParams>,
  reducedTimeRange?: string
): MetricAggregationColumnWithoutSpecialParams | null => {
  if (!isSupportedAggregationWithoutParams(aggregation.name)) {
    return null;
  }

  let sourceField;

  if (isMetricWithField(agg)) {
    sourceField = agg.aggParams?.field ?? 'document';
  } else {
    sourceField = 'document';
  }

  const field = dataView.getFieldByName(sourceField);
  if (!field && aggregation.isFieldRequired) {
    return null;
  }

  return {
    operationType: aggregation.name,
    sourceField,
    ...createColumn(agg, field, {
      reducedTimeRange,
    }),
    params: {
      ...(agg.format.id && {
        format: {
          id: agg.format.id,
        },
      }),
    },
  } as MetricAggregationColumnWithoutSpecialParams;
};

export const convertСustomMetricAggregationColumnWithoutSpecialParams = (
  aggregation: SupportedMetric,
  { agg, dataView }: { agg: IAggConfig; dataView: DataView },
  reducedTimeRange?: string
): MetricAggregationColumnWithoutSpecialParams | null => {
  if (!isSupportedAggregationWithoutParams(aggregation.name)) {
    return null;
  }

  let sourceField;

  if (agg) {
    sourceField = agg.params?.field ?? 'document';
  }

  const field = dataView.getFieldByName(sourceField);
  if (!field && aggregation.isFieldRequired) {
    return null;
  }

  return {
    operationType: aggregation.name,
    sourceField,
    ...createColumnFromCustomAgg(agg, field, {
      reducedTimeRange,
    }),
    params: {},
  } as MetricAggregationColumnWithoutSpecialParams;
};
