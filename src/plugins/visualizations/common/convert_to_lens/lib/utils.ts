/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual, omit } from 'lodash';
import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DataViewFieldBase } from '@kbn/es-query';
import { BaseSchemaConfig } from '../../types';
import { Column } from '../types';
import {
  MetricsWithoutSpecialParams,
  Column as ColumnWithMeta,
  SiblingPipelineMetric,
} from './convert';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

export const getLabel = (agg: BaseSchemaConfig) => {
  return agg.aggParams && 'customLabel' in agg.aggParams
    ? agg.aggParams.customLabel ?? agg.label
    : agg.label;
};

export const getLabelForPercentile = (agg: BaseSchemaConfig) => {
  return agg.aggParams && 'customLabel' in agg.aggParams && agg.aggParams.customLabel !== ''
    ? agg.label
    : '';
};

export const getValidColumns = (columns: Array<Column | null> | Column | null | undefined) => {
  if (columns && Array.isArray(columns)) {
    const nonNullColumns = columns.filter(
      (c): c is Exclude<UnwrapArray<typeof columns>, null> => c !== null
    );

    if (nonNullColumns.length !== columns.length) {
      return null;
    }

    return nonNullColumns;
  }

  return columns ? [columns] : null;
};

export const getFieldNameFromField = (
  field: DataViewField | DataViewFieldBase | string | undefined
) => {
  if (!field) {
    return null;
  }

  if (typeof field === 'string') {
    return field;
  }

  return field.name;
};

export const isSchemaConfig = (agg: BaseSchemaConfig | IAggConfig): agg is BaseSchemaConfig => {
  if ((agg as BaseSchemaConfig).aggType) {
    return true;
  }
  return false;
};

export const isColumnWithMeta = (column: Column): column is ColumnWithMeta => {
  if ((column as ColumnWithMeta).meta) {
    return true;
  }
  return false;
};

const SIBBLING_PIPELINE_AGGS: string[] = [
  METRIC_TYPES.AVG_BUCKET,
  METRIC_TYPES.SUM_BUCKET,
  METRIC_TYPES.MAX_BUCKET,
  METRIC_TYPES.MIN_BUCKET,
];

const PARENT_PIPELINE_AGGS: string[] = [
  METRIC_TYPES.CUMULATIVE_SUM,
  METRIC_TYPES.DERIVATIVE,
  METRIC_TYPES.MOVING_FN,
];

const AGGS_WITHOUT_SPECIAL_RARAMS: string[] = [
  METRIC_TYPES.AVG,
  METRIC_TYPES.COUNT,
  METRIC_TYPES.MAX,
  METRIC_TYPES.MIN,
  METRIC_TYPES.SUM,
  METRIC_TYPES.MEDIAN,
  METRIC_TYPES.CARDINALITY,
  METRIC_TYPES.VALUE_COUNT,
];

const PIPELINE_AGGS: string[] = [...SIBBLING_PIPELINE_AGGS, ...PARENT_PIPELINE_AGGS];

export const isSiblingPipeline = (
  metric: BaseSchemaConfig
): metric is BaseSchemaConfig<SiblingPipelineMetric> => {
  return SIBBLING_PIPELINE_AGGS.includes(metric.aggType);
};

export const isPipeline = (
  metric: BaseSchemaConfig
): metric is
  | BaseSchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>
  | BaseSchemaConfig<METRIC_TYPES.DERIVATIVE>
  | BaseSchemaConfig<METRIC_TYPES.MOVING_FN>
  | BaseSchemaConfig<METRIC_TYPES.AVG_BUCKET>
  | BaseSchemaConfig<METRIC_TYPES.MAX_BUCKET>
  | BaseSchemaConfig<METRIC_TYPES.MIN_BUCKET>
  | BaseSchemaConfig<METRIC_TYPES.SUM_BUCKET> => {
  return PIPELINE_AGGS.includes(metric.aggType);
};

export const isMetricAggWithoutParams = (
  metric: BaseSchemaConfig
): metric is BaseSchemaConfig<MetricsWithoutSpecialParams> => {
  return AGGS_WITHOUT_SPECIAL_RARAMS.includes(metric.aggType);
};

export const isPercentileAgg = (
  metric: BaseSchemaConfig
): metric is BaseSchemaConfig<METRIC_TYPES.PERCENTILES> => {
  return metric.aggType === METRIC_TYPES.PERCENTILES;
};

export const isPercentileRankAgg = (
  metric: BaseSchemaConfig
): metric is BaseSchemaConfig<METRIC_TYPES.PERCENTILE_RANKS> => {
  return metric.aggType === METRIC_TYPES.PERCENTILE_RANKS;
};

export const isStdDevAgg = (
  metric: BaseSchemaConfig
): metric is BaseSchemaConfig<METRIC_TYPES.STD_DEV> => {
  return metric.aggType === METRIC_TYPES.STD_DEV;
};

export const getCutomBucketsFromSiblingAggs = (metrics: BaseSchemaConfig[]) => {
  return metrics.reduce<IAggConfig[]>((acc, metric) => {
    if (
      isSiblingPipeline(metric) &&
      metric.aggParams?.customBucket &&
      acc.every(
        (bucket) =>
          !isEqual(
            omit(metric.aggParams?.customBucket?.serialize(), ['id']),
            omit(bucket.serialize(), ['id'])
          )
      )
    ) {
      acc.push(metric.aggParams.customBucket);
    }

    return acc;
  }, []);
};
