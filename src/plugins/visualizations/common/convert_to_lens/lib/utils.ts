/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual, omit } from 'lodash';
import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DataViewFieldBase } from '@kbn/es-query';
import { SchemaConfig } from '../../types';
import {
  AggBasedColumn,
  MetricsWithoutSpecialParams,
  ParentPipelineMetric,
  SiblingPipelineMetric,
} from './convert';
import { ColumnWithMeta } from '../types';
import { convertToSchemaConfig } from '../../vis_schemas';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

export const getLabel = (agg: SchemaConfig) => {
  return agg.aggParams && 'customLabel' in agg.aggParams
    ? agg.aggParams.customLabel ?? agg.label
    : agg.label;
};

export const getLabelForPercentile = (agg: SchemaConfig) => {
  return agg.aggParams && 'customLabel' in agg.aggParams && agg.aggParams.customLabel !== ''
    ? agg.label
    : '';
};

export const getValidColumns = (
  columns: Array<AggBasedColumn | null> | AggBasedColumn | null | undefined
) => {
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

export const isSchemaConfig = (agg: SchemaConfig | IAggConfig): agg is SchemaConfig => {
  if ((agg as SchemaConfig).aggType) {
    return true;
  }
  return false;
};

export const isColumnWithMeta = (
  column: AggBasedColumn | ColumnWithMeta
): column is ColumnWithMeta => {
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
  metric: SchemaConfig
): metric is SchemaConfig<SiblingPipelineMetric> => {
  return SIBBLING_PIPELINE_AGGS.includes(metric.aggType);
};

export const isPipeline = (
  metric: SchemaConfig
): metric is SchemaConfig<
  | METRIC_TYPES.CUMULATIVE_SUM
  | METRIC_TYPES.DERIVATIVE
  | METRIC_TYPES.MOVING_FN
  | METRIC_TYPES.AVG_BUCKET
  | METRIC_TYPES.MAX_BUCKET
  | METRIC_TYPES.MIN_BUCKET
  | METRIC_TYPES.SUM_BUCKET
> => {
  return PIPELINE_AGGS.includes(metric.aggType);
};

export const isMetricAggWithoutParams = (
  metric: SchemaConfig
): metric is SchemaConfig<MetricsWithoutSpecialParams> => {
  return AGGS_WITHOUT_SPECIAL_RARAMS.includes(metric.aggType);
};

export const isPercentileAgg = (
  metric: SchemaConfig
): metric is SchemaConfig<METRIC_TYPES.PERCENTILES> => {
  return metric.aggType === METRIC_TYPES.PERCENTILES;
};

export const isPercentileRankAgg = (
  metric: SchemaConfig
): metric is SchemaConfig<METRIC_TYPES.PERCENTILE_RANKS> => {
  return metric.aggType === METRIC_TYPES.PERCENTILE_RANKS;
};

export const isStdDevAgg = (metric: SchemaConfig): metric is SchemaConfig<METRIC_TYPES.STD_DEV> => {
  return metric.aggType === METRIC_TYPES.STD_DEV;
};

export const getCustomBucketsFromSiblingAggs = (metrics: SchemaConfig[]) => {
  return metrics.reduce<Array<{ customBucket: IAggConfig; metricIds: string[] }>>((acc, metric) => {
    if (isSiblingPipeline(metric) && metric.aggParams?.customBucket && metric.aggId) {
      const customBucket = acc.find((bucket) =>
        isEqual(
          omit(metric.aggParams?.customBucket?.serialize(), ['id']),
          omit(bucket.customBucket.serialize(), ['id'])
        )
      );
      if (customBucket) {
        customBucket.metricIds.push(metric.aggId);
      } else {
        acc.push({ customBucket: metric.aggParams.customBucket, metricIds: [metric.aggId] });
      }
    }

    return acc;
  }, []);
};

export const getMetricFromParentPipelineAgg = (
  agg: SchemaConfig<ParentPipelineMetric | SiblingPipelineMetric>,
  aggs: Array<SchemaConfig<METRIC_TYPES>>
): SchemaConfig<METRIC_TYPES> | null => {
  if (!agg.aggParams) {
    return null;
  }

  if (isSiblingPipeline(agg)) {
    if (agg.aggParams.customMetric) {
      return convertToSchemaConfig(agg.aggParams.customMetric);
    }
    return null;
  }

  const { customMetric, metricAgg } = agg.aggParams;
  if (!customMetric && metricAgg === 'custom') {
    return null;
  }

  let metric;
  if (!customMetric) {
    metric = aggs.find(({ aggId }) => aggId === metricAgg);
  } else {
    metric = convertToSchemaConfig(customMetric);
  }

  return metric as SchemaConfig<METRIC_TYPES>;
};

const aggIdWithDecimalsRegexp = /^(\w)+\['([0-9]+\.[0-9]+)'\]$/;

export const getAggIdAndValue = (aggId?: string) => {
  if (!aggId) {
    return [];
  }
  // agg value contains decimals
  if (/\['/.test(aggId)) {
    const [_, id, value] = aggId.match(aggIdWithDecimalsRegexp) || [];
    return [id, value];
  }
  return aggId.split('.');
};
