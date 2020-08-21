/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get } from 'lodash';
import moment from 'moment';
import { formatExpression, SerializedFieldFormat } from '../../../../plugins/expressions/public';
import { IAggConfig, search, TimefilterContract } from '../../../../plugins/data/public';
import { Vis, VisParams } from '../types';
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
  bucket?: any[];
  geo_centroid?: any[];
  group?: any[];
  params?: any[];
  radius?: any[];
  segment?: any[];
  split_column?: any[];
  split_row?: any[];
  width?: any[];
  // catch all for schema name
  [key: string]: any[] | undefined;
}

type BuildVisFunction = (
  params: VisParams,
  schemas: Schemas,
  uiState: any,
  meta?: { savedObjectId?: string }
) => string;

// eslint-disable-next-line @typescript-eslint/naming-convention
type buildVisConfigFunction = (schemas: Schemas, visParams?: VisParams) => VisParams;

interface BuildPipelineVisFunction {
  [key: string]: BuildVisFunction;
}

interface BuildVisConfigFunction {
  [key: string]: buildVisConfigFunction;
}

const vislibCharts: string[] = [
  'area',
  'gauge',
  'goal',
  'heatmap',
  'histogram',
  'horizontal_bar',
  'line',
];

export const getSchemas = (
  vis: Vis,
  opts: {
    timeRange?: any;
    timefilter: TimefilterContract;
  }
): Schemas => {
  const { timeRange, timefilter } = opts;
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
      schemaName = `split_${vis.params.row ? 'row' : 'column'}`;
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

const adjustVislibDimensionFormmaters = (vis: Vis, dimensions: { y: any[] }): void => {
  const visConfig = vis.params;
  const responseAggs = vis.data.aggs!.getResponseAggs().filter((agg: IAggConfig) => agg.enabled);

  (dimensions.y || []).forEach((yDimension) => {
    const yAgg = responseAggs[yDimension.accessor];
    const seriesParam = (visConfig.seriesParams || []).find(
      (param: any) => param.data.id === yAgg.id
    );
    if (seriesParam) {
      const usedValueAxis = (visConfig.valueAxes || []).find(
        (valueAxis: any) => valueAxis.id === seriesParam.valueAxis
      );
      if (get(usedValueAxis, 'scale.mode') === 'percentage') {
        yDimension.format = { id: 'percent' };
      }
    }
    if (get(visConfig, 'gauge.percentageMode') === true) {
      yDimension.format = { id: 'percent' };
    }
  });
};

export const buildPipelineVisFunction: BuildPipelineVisFunction = {
  vega: (params) => {
    return `vega ${prepareString('spec', params.spec)}`;
  },
  input_control_vis: (params) => {
    return `input_control_vis ${prepareJson('visConfig', params)}`;
  },
  metrics: ({ title, ...params }, schemas, uiState = {}) => {
    const paramsJson = prepareJson('params', params);
    const uiStateJson = prepareJson('uiState', uiState);

    const paramsArray = [paramsJson, uiStateJson].filter((param) => Boolean(param));
    return `tsvb ${paramsArray.join(' ')}`;
  },
  timelion: (params) => {
    const expression = prepareString('expression', params.expression);
    const interval = prepareString('interval', params.interval);
    return `timelion_vis ${expression}${interval}`;
  },
  table: (params, schemas) => {
    const visConfig = {
      ...params,
      ...buildVisConfig.table(schemas, params),
    };
    return `kibana_table ${prepareJson('visConfig', visConfig)}`;
  },
  tagcloud: (params, schemas) => {
    const { scale, orientation, minFontSize, maxFontSize, showLabel } = params;
    const { metric, bucket } = buildVisConfig.tagcloud(schemas);
    let expr = `tagcloud metric={visdimension ${metric.accessor}} `;
    expr += prepareValue('scale', scale);
    expr += prepareValue('orientation', orientation);
    expr += prepareValue('minFontSize', minFontSize);
    expr += prepareValue('maxFontSize', maxFontSize);
    expr += prepareValue('showLabel', showLabel);
    expr += prepareDimension('bucket', bucket);

    return expr;
  },
  region_map: (params, schemas) => {
    const visConfig = {
      ...params,
      ...buildVisConfig.region_map(schemas),
    };
    return `regionmap ${prepareJson('visConfig', visConfig)}`;
  },
  tile_map: (params, schemas) => {
    const visConfig = {
      ...params,
      ...buildVisConfig.tile_map(schemas),
    };
    return `tilemap ${prepareJson('visConfig', visConfig)}`;
  },
  pie: (params, schemas) => {
    const visConfig = {
      ...params,
      ...buildVisConfig.pie(schemas),
    };
    return `kibana_pie ${prepareJson('visConfig', visConfig)}`;
  },
};

const buildVisConfig: BuildVisConfigFunction = {
  table: (schemas, visParams = {}) => {
    const visConfig = {} as any;
    const metrics = schemas.metric;
    const buckets = schemas.bucket || [];
    visConfig.dimensions = {
      metrics,
      buckets,
      splitRow: schemas.split_row,
      splitColumn: schemas.split_column,
    };

    if (visParams.showMetricsAtAllLevels === false && visParams.showPartialRows === true) {
      // Handle case where user wants to see partial rows but not metrics at all levels.
      // This requires calculating how many metrics will come back in the tabified response,
      // and removing all metrics from the dimensions except the last set.
      const metricsPerBucket = metrics.length / buckets.length;
      visConfig.dimensions.metrics.splice(0, metricsPerBucket * buckets.length - metricsPerBucket);
    }
    return visConfig;
  },
  tagcloud: (schemas) => {
    const visConfig = {} as any;
    visConfig.metric = schemas.metric[0];
    if (schemas.segment) {
      visConfig.bucket = schemas.segment[0];
    }
    return visConfig;
  },
  region_map: (schemas) => {
    const visConfig = {} as any;
    visConfig.metric = schemas.metric[0];
    if (schemas.segment) {
      visConfig.bucket = schemas.segment[0];
    }
    return visConfig;
  },
  tile_map: (schemas) => {
    const visConfig = {} as any;
    visConfig.dimensions = {
      metric: schemas.metric[0],
      geohash: schemas.segment ? schemas.segment[0] : null,
      geocentroid: schemas.geo_centroid ? schemas.geo_centroid[0] : null,
    };
    return visConfig;
  },
  pie: (schemas) => {
    const visConfig = {} as any;
    visConfig.dimensions = {
      metric: schemas.metric[0],
      buckets: schemas.segment,
      splitRow: schemas.split_row,
      splitColumn: schemas.split_column,
    };
    return visConfig;
  },
};

export const buildVislibDimensions = async (
  vis: any,
  params: {
    timefilter: TimefilterContract;
    timeRange?: any;
    abortSignal?: AbortSignal;
  }
) => {
  const schemas = getSchemas(vis, {
    timeRange: params.timeRange,
    timefilter: params.timefilter,
  });
  const dimensions = {
    x: schemas.segment ? schemas.segment[0] : null,
    y: schemas.metric,
    z: schemas.radius,
    width: schemas.width,
    series: schemas.group,
    splitRow: schemas.split_row,
    splitColumn: schemas.split_column,
  };
  if (schemas.segment) {
    const xAgg = vis.data.aggs.getResponseAggs()[dimensions.x.accessor];
    if (xAgg.type.name === 'date_histogram') {
      dimensions.x.params.date = true;
      const { esUnit, esValue } = xAgg.buckets.getInterval();
      dimensions.x.params.interval = moment.duration(esValue, esUnit);
      dimensions.x.params.intervalESValue = esValue;
      dimensions.x.params.intervalESUnit = esUnit;
      dimensions.x.params.format = xAgg.buckets.getScaledDateFormat();
      dimensions.x.params.bounds = xAgg.buckets.getBounds();
    } else if (xAgg.type.name === 'histogram') {
      const intervalParam = xAgg.type.paramByName('interval');
      const output = { params: {} as any };
      await intervalParam.modifyAggConfigOnSearchRequestStart(xAgg, vis.data.searchSource, {
        abortSignal: params.abortSignal,
      });
      intervalParam.write(xAgg, output);
      dimensions.x.params.interval = output.params.interval;
    }
  }

  adjustVislibDimensionFormmaters(vis, dimensions);
  return dimensions;
};

export const buildPipeline = async (
  vis: Vis,
  params: {
    timefilter: TimefilterContract;
    timeRange?: any;
    abortSignal?: AbortSignal;
  }
) => {
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
    ${prepareString('index', indexPattern!.id)}
    metricsAtAllLevels=${vis.isHierarchical()}
    partialRows=${vis.type.requiresPartialRows || vis.params.showPartialRows || false}
    ${prepareJson('aggConfigs', vis.data.aggs!.aggs)} | `;
    }

    const schemas = getSchemas(vis, {
      timeRange: params.timeRange,
      timefilter: params.timefilter,
    });
    if (buildPipelineVisFunction[vis.type.name]) {
      pipeline += buildPipelineVisFunction[vis.type.name](
        { title, ...vis.params },
        schemas,
        uiState
      );
    } else if (vislibCharts.includes(vis.type.name)) {
      const visConfig = { ...vis.params };
      visConfig.dimensions = await buildVislibDimensions(vis, params);

      pipeline += `vislib type='${vis.type.name}' ${prepareJson('visConfig', visConfig)}`;
    } else {
      const visConfig = { ...vis.params };
      visConfig.dimensions = schemas;
      pipeline += `visualization type='${vis.type.name}'
    ${prepareJson('visConfig', visConfig)}
    metricsAtAllLevels=${vis.isHierarchical()}
    partialRows=${vis.type.requiresPartialRows || vis.params.showPartialRows || false} `;
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
