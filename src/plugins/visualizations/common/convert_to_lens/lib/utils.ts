/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DataViewFieldBase } from '@kbn/es-query';
import { SchemaConfig } from '../../types';
import { Column } from '../types';
import { Column as ColumnWithMeta, SiblingPipelineMetric } from './convert/types';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

export const getLabel = (agg: SchemaConfig) => {
  return agg.aggParams && 'customLabel' in agg.aggParams
    ? agg.aggParams.customLabel ?? agg.label
    : agg.label;
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

export const isSchemaConfig = (agg: SchemaConfig | IAggConfig): agg is SchemaConfig => {
  if ((agg as SchemaConfig).aggType) {
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

export const isSiblingPipeline = (
  metric: SchemaConfig
): metric is SchemaConfig<SiblingPipelineMetric> => {
  return SIBBLING_PIPELINE_AGGS.includes(metric.aggType);
};

export const getCutomBucketsFromSiblingAggs = (metrics: SchemaConfig[]) => {
  return metrics.reduce<IAggConfig[]>((acc, metric) => {
    if (
      isSiblingPipeline(metric) &&
      metric.aggParams?.customBucket &&
      acc.every(
        (bucket) => !_.isEqual(metric.aggParams?.customBucket?.serialize(), bucket.serialize())
      )
    ) {
      acc.push(metric.aggParams.customBucket);
    }

    return acc;
  }, []);
};
