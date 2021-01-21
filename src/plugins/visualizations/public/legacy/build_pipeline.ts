/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  buildExpression,
  formatExpression,
  SerializedFieldFormat,
} from '../../../../plugins/expressions/public';
import { IAggConfig, search, TimefilterContract } from '../../../../plugins/data/public';
import { Vis } from '../types';
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
export interface BuildPipelineParams {
  timefilter: TimefilterContract;
  timeRange?: any;
  abortSignal?: AbortSignal;
}

export const getSchemas = <TVisParams>(
  vis: Vis<TVisParams>,
  { timeRange, timefilter }: BuildPipelineParams
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

export const prepareJson = (variable: string, data?: object): string => {
  if (data === undefined) {
    return '';
  }
  return `${variable}='${JSON.stringify(data).replace(/\\/g, `\\\\`).replace(/'/g, `\\'`)}' `;
};

export const escapeString = (data: string): string => {
  return data.replace(/\\/g, `\\\\`).replace(/'/g, `\\'`);
};

export const prepareString = (variable: string, data?: string): string => {
  if (data === undefined) {
    return '';
  }
  return `${variable}='${escapeString(data)}' `;
};

export const prepareValue = (variable: string, data: any, raw: boolean = false) => {
  if (data === undefined) {
    return '';
  }
  if (raw) {
    return `${variable}=${data} `;
  }
  switch (typeof data) {
    case 'string':
      return prepareString(variable, data);
    case 'object':
      return prepareJson(variable, data);
    default:
      return `${variable}=${data} `;
  }
};

export const prepareDimension = (variable: string, data: any) => {
  if (data === undefined) {
    return '';
  }

  let expr = `${variable}={visdimension ${data.accessor} `;
  if (data.format) {
    expr += prepareValue('format', data.format.id);
    expr += prepareJson('formatParams', data.format.params);
  }
  expr += '} ';

  return expr;
};

export const buildPipeline = async (vis: Vis, params: BuildPipelineParams) => {
  const { indexPattern, searchSource } = vis.data;
  const query = searchSource!.getField('query');
  const filters = searchSource!.getField('filter');
  const { uiState, title } = vis;

  // context
  let pipeline = `kibana | kibana_context `;
  if (query) {
    pipeline += prepareJson('query', query);
  }
  if (filters) {
    pipeline += prepareJson('filters', filters);
  }
  if (vis.data.savedSearchId) {
    pipeline += prepareString('savedSearchId', vis.data.savedSearchId);
  }
  pipeline += '| ';

  if (vis.type.toExpressionAst) {
    const visAst = await vis.type.toExpressionAst(vis, params);
    pipeline += formatExpression(visAst);
  } else {
    // request handler
    if (vis.type.requestHandler === 'courier') {
      pipeline += `esaggs
    index={indexPatternLoad ${prepareString('id', indexPattern!.id)}}
    metricsAtAllLevels=${vis.isHierarchical()}
    partialRows=${vis.params.showPartialRows || false} `;
      if (vis.data.aggs) {
        vis.data.aggs.aggs.forEach((agg) => {
          const ast = agg.toExpressionAst();
          if (ast) {
            pipeline += `aggs={${buildExpression(ast).toString()}} `;
          }
        });
      }
      pipeline += `| `;
    } else {
      const schemas = getSchemas(vis, params);
      const visConfig = { ...vis.params };
      visConfig.dimensions = schemas;
      visConfig.title = title;
      pipeline += `visualization type='${vis.type.name}'
    ${prepareJson('visConfig', visConfig)}
    ${prepareJson('uiState', uiState)}
    metricsAtAllLevels=${vis.isHierarchical()}
    partialRows=${vis.params.showPartialRows || false} `;
      if (indexPattern) {
        pipeline += `${prepareString('index', indexPattern.id)} `;
        if (vis.data.aggs) {
          pipeline += `${prepareJson('aggConfigs', vis.data.aggs!.aggs)}`;
        }
      }
    }
  }

  return pipeline;
};
