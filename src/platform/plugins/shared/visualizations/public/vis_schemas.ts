/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BUCKET_TYPES,
  IAggConfig,
  METRIC_TYPES,
  SHARD_DELAY_AGG_NAME,
} from '@kbn/data-plugin/common';
import { search } from '@kbn/data-plugin/public';
import { Vis, VisToExpressionAstParams } from './types';
import { SchemaConfig, VisParams } from '../common/types';
import { convertToSchemaConfig } from '../common';

const { isDateHistogramBucketAggConfig } = search.aggs;

const SUPPORTED_AGGREGATIONS = [
  ...Object.values(METRIC_TYPES),
  ...Object.values(BUCKET_TYPES),
  SHARD_DELAY_AGG_NAME,
];

type SupportedAggregation = (typeof SUPPORTED_AGGREGATIONS)[number];

function isSupportedAggType(name: string): name is SupportedAggregation {
  return SUPPORTED_AGGREGATIONS.includes(name as SupportedAggregation);
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

const updateDateHistogramParams = (
  agg: IAggConfig,
  { timeRange, timefilter }: VisToExpressionAstParams
) => {
  if (isDateHistogramBucketAggConfig(agg)) {
    agg.params.timeRange = timeRange;
    const bounds =
      agg.params.timeRange && agg.fieldIsTimeField()
        ? timefilter.calculateBounds(agg.params.timeRange)
        : undefined;
    agg.buckets.setBounds(bounds);
    agg.buckets.setInterval(agg.params.interval);
  }
  return agg;
};

const createSchemaConfig = (
  agg: IAggConfig,
  accessor: number,
  params: VisToExpressionAstParams
): SchemaConfig => {
  const aggType = agg.type.name;
  if (!isSupportedAggType(aggType)) {
    throw new Error(`Unsupported agg type: ${aggType}`);
  }

  const updatedAgg = updateDateHistogramParams(agg, params);
  return { ...convertToSchemaConfig(updatedAgg), accessor };
};

export const getVisSchemas = <TVisParams extends VisParams>(
  vis: Vis<TVisParams>,
  params: VisToExpressionAstParams
): Schemas => {
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
      schemas[schemaName]!.push(createSchemaConfig(agg, cnt++, params));
    }
    if (isHierarchical && (agg.type.type !== 'metrics' || metrics.length === responseAggs.length)) {
      metrics.forEach((metric: any) => {
        const schemaConfig = createSchemaConfig(metric, cnt++, params);
        if (!skipMetrics) {
          schemas.metric.push(schemaConfig);
        }
      });
    }
  });
  return schemas;
};
