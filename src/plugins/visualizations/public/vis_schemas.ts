/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { IAggConfig, search } from '@kbn/data-plugin/public';

import { Vis, VisToExpressionAstParams } from './types';

const { isDateHistogramBucketAggConfig } = search.aggs;

interface SchemaConfigParams {
  precision?: number;
  useGeocentroid?: boolean;
}

export interface SchemaConfig {
  accessor: number;
  label: string;
  format: SerializedFieldFormat;
  params: SchemaConfigParams;
  aggType: string;
}

export interface Schemas {
  metric: SchemaConfig[];
  bucket?: SchemaConfig[];
  geo_centroid?: any[];
  group?: any[];
  params?: any[];
  radius?: any[];
  segment?: any[];
  split_column?: SchemaConfig[];
  split_row?: SchemaConfig[];
  width?: any[];
  // catch all for schema name
  [key: string]: any[] | undefined;
}

export const getVisSchemas = <TVisParams>(
  vis: Vis<TVisParams>,
  { timeRange, timefilter }: VisToExpressionAstParams
): Schemas => {
  const createSchemaConfig = (accessor: number, agg: IAggConfig): SchemaConfig => {
    if (isDateHistogramBucketAggConfig(agg)) {
      agg.params.timeRange = timeRange;
      const bounds =
        agg.params.timeRange && agg.fieldIsTimeField()
          ? timefilter.calculateBounds(agg.params.timeRange)
          : undefined;
      agg.buckets.setBounds(bounds);
      agg.buckets.setInterval(agg.params.interval);
    }

    const hasSubAgg = [
      'derivative',
      'moving_avg',
      'serial_diff',
      'cumulative_sum',
      'sum_bucket',
      'avg_bucket',
      'min_bucket',
      'max_bucket',
    ].includes(agg.type.name);

    const formatAgg = hasSubAgg
      ? agg.params.customMetric || agg.aggConfigs.getRequestAggById(agg.params.metricAgg)
      : agg;

    const params: SchemaConfigParams = {};

    if (agg.type.name === 'geohash_grid') {
      params.precision = agg.params.precision;
      params.useGeocentroid = agg.params.useGeocentroid;
    }

    const label = agg.makeLabel && agg.makeLabel();

    return {
      accessor,
      format: formatAgg.toSerializedFieldFormat(),
      params,
      label,
      aggType: agg.type.name,
    };
  };

  let cnt = 0;
  const schemas: Schemas = {
    metric: [],
  };

  if (!vis.data.aggs) {
    return schemas;
  }

  const responseAggs = vis.data.aggs.getResponseAggs().filter((agg: IAggConfig) => agg.enabled);
  const isHierarchical = vis.isHierarchical();
  const metrics = responseAggs.filter((agg: IAggConfig) => agg.type.type === 'metrics');
  responseAggs.forEach((agg: IAggConfig) => {
    let skipMetrics = false;
    let schemaName = agg.schema;
    if (!schemaName) {
      if (agg.type.name === 'geo_centroid') {
        schemaName = 'geo_centroid';
      } else {
        cnt++;
        return;
      }
    }
    if (schemaName === 'split') {
      // TODO: We should check if there's a better way then casting to `any` here
      schemaName = `split_${(vis.params as any).row ? 'row' : 'column'}`;
      skipMetrics = responseAggs.length - metrics.length > 1;
    }
    if (!schemas[schemaName]) {
      schemas[schemaName] = [];
    }
    if (!isHierarchical || agg.type.type !== 'metrics') {
      schemas[schemaName]!.push(createSchemaConfig(cnt++, agg));
    }
    if (isHierarchical && (agg.type.type !== 'metrics' || metrics.length === responseAggs.length)) {
      metrics.forEach((metric: any) => {
        const schemaConfig = createSchemaConfig(cnt++, metric);
        if (!skipMetrics) {
          schemas.metric.push(schemaConfig);
        }
      });
    }
  });
  return schemas;
};
