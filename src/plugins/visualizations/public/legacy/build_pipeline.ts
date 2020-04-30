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

import { get, omit } from 'lodash';
import moment from 'moment';
import {
  buildExpression,
  buildExpressionFunction,
  parseExpression,
  SerializedFieldFormat,
} from '../../../../plugins/expressions/public';
import {
  IAggConfig,
  fieldFormats,
  search,
  TimefilterContract,
  TimeRange,
} from '../../../../plugins/data/public';
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

type buildVisFunction = (params: VisParams, schemas: Schemas, uiState?: any) => string;
type buildVisConfigFunction = (schemas: Schemas, visParams?: VisParams) => VisParams;

interface BuildPipelineVisFunction {
  [key: string]: buildVisFunction;
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

const getSchemas = (
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

    const format = fieldFormats.serialize(
      hasSubAgg
        ? agg.params.customMetric || agg.aggConfigs.getRequestAggById(agg.params.metricAgg)
        : agg
    );

    const params: SchemaConfigParams = {};

    if (agg.type.name === 'geohash_grid') {
      params.precision = agg.params.precision;
      params.useGeocentroid = agg.params.useGeocentroid;
    }

    const label = agg.makeLabel && agg.makeLabel();

    return {
      accessor,
      format,
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
  return `${variable}='${JSON.stringify(data)
    .replace(/\\/g, `\\\\`)
    .replace(/'/g, `\\'`)}' `;
};

const escapeString = (data: string): string => {
  return data.replace(/\\/g, `\\\\`).replace(/'/g, `\\'`);
};

export const prepareString = (variable: string, data?: string): string => {
  if (data === undefined) {
    return '';
  }
  return `${variable}='${escapeString(data)}' `;
};

const adjustVislibDimensionFormmaters = (vis: Vis, dimensions: { y: any[] }): void => {
  const visConfig = vis.params;
  const responseAggs = vis.data.aggs!.getResponseAggs().filter((agg: IAggConfig) => agg.enabled);

  (dimensions.y || []).forEach(yDimension => {
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
  vega: ({ spec }) => {
    return buildExpressionFunction('vega', { spec }).toString();
  },
  input_control_vis: params => {
    return buildExpressionFunction('input_control_vis', {
      visConfig: JSON.stringify(params),
    }).toString();
  },
  metrics: (params, schemas, uiState = {}) => {
    return buildExpressionFunction('tsvb', {
      params: JSON.stringify(params),
      uiState: JSON.stringify(uiState),
    }).toString();
  },
  timelion: ({ expression, interval }) => {
    return buildExpressionFunction('timelion_vis', {
      expression,
      interval,
    }).toString();
  },
  markdown: ({ markdown, fontSize, openLinksInNewTab }) => {
    const font = buildExpression([buildExpressionFunction('font', { size: fontSize })]);
    return buildExpressionFunction('markdownVis', {
      markdown: markdown ?? '',
      font,
      openLinksInNewTab,
    }).toString();
  },
  table: (params, schemas) => {
    return buildExpressionFunction('kibana_table', {
      visConfig: JSON.stringify({
        ...params,
        ...buildVisConfig.table(schemas, params),
      }),
    }).toString();
  },
  metric: (params, schemas) => {
    const {
      percentageMode,
      useRanges,
      colorSchema,
      metricColorMode: colorMode,
      colorsRange = [],
      labels,
      invertColors,
      style,
    } = params.metric;
    const { metrics, bucket } = buildVisConfig.metric(schemas).dimensions;

    // fix formatter for percentage mode
    if (get(params, 'metric.percentageMode') === true) {
      metrics.forEach((metric: SchemaConfig) => {
        metric.format = { id: 'percent' };
      });
    }

    const fontFn = style
      ? buildExpression([buildExpressionFunction('font', { size: style.fontSize })])
      : undefined;

    const colorRangeFns = colorsRange.map((range: { from: number; to: number }) => {
      return buildExpression([
        buildExpressionFunction('range', {
          from: range.from,
          to: range.to,
        }),
      ]);
    });

    const visdimensionMetricFns = metrics.length
      ? metrics.map((metric: SchemaConfig) => {
          const fn = buildExpressionFunction('visdimension', { accessor: metric.accessor });
          if (metric.format?.id) {
            fn.addArgument('format', metric.format.id);
          }
          if (metric.format?.params) {
            fn.addArgument('formatParams', JSON.stringify(metric.format.params));
          }
          return buildExpression([fn]);
        })
      : undefined;

    const visdimensionBucketFn =
      bucket && style
        ? buildExpressionFunction('visdimension', { accessor: bucket.accessor })
        : undefined;

    if (visdimensionBucketFn && bucket.format) {
      if (bucket.format?.id) {
        visdimensionBucketFn.addArgument('format', bucket.format.id);
      }
      if (bucket.format?.params) {
        visdimensionBucketFn.addArgument('formatParams', JSON.stringify(bucket.format.params));
      }
    }

    const args = {
      percentageMode,
      colorSchema,
      colorMode,
      useRanges,
      invertColors,
      showLabels: labels?.show,
      bgFill: style?.bgFill,
      font: fontFn,
      subText: style?.subText,
      colorRange: colorRangeFns,
      metric: visdimensionMetricFns ? visdimensionMetricFns : undefined,
      bucket: visdimensionBucketFn ? buildExpression([visdimensionBucketFn]) : undefined,
    };

    return buildExpressionFunction('metricvis', {
      ...omit(args, i => i === null || typeof i === 'undefined'),
    }).toString();
  },
  tagcloud: (params, schemas) => {
    const { scale, orientation, minFontSize, maxFontSize, showLabel } = params;
    const visConfig = buildVisConfig.tagcloud(schemas);

    const visdimensionMetric = visConfig.metric
      ? buildExpressionFunction('visdimension', { accessor: visConfig.metric.accessor })
      : undefined;

    const visdimensionBucket = visConfig.bucket
      ? buildExpressionFunction('visdimension', { accessor: visConfig.bucket.accessor })
      : undefined;

    if (visdimensionBucket && visConfig.bucket.format) {
      visdimensionBucket.addArgument('format', visConfig.bucket.format.id);
      visdimensionBucket.addArgument(
        'formatParams',
        JSON.stringify(visConfig.bucket.format.params)
      );
    }

    const args = {
      metric: visdimensionMetric ? buildExpression([visdimensionMetric]) : undefined,
      bucket: visdimensionBucket ? buildExpression([visdimensionBucket]) : undefined,
      scale,
      orientation,
      minFontSize,
      maxFontSize,
      showLabel,
    };

    return buildExpressionFunction('tagcloud', {
      ...omit(args, i => i === null || typeof i === 'undefined'),
    }).toString();
  },
  region_map: (params, schemas) => {
    return buildExpressionFunction('regionmap', {
      visConfig: JSON.stringify({
        ...params,
        ...buildVisConfig.region_map(schemas),
      }),
    }).toString();
  },
  tile_map: (params, schemas) => {
    return buildExpressionFunction('tilemap', {
      visConfig: JSON.stringify({
        ...params,
        ...buildVisConfig.tile_map(schemas),
      }),
    }).toString();
  },
  pie: (params, schemas) => {
    return buildExpressionFunction('kibana_pie', {
      visConfig: JSON.stringify({
        ...params,
        ...buildVisConfig.pie(schemas),
      }),
    }).toString();
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
  metric: schemas => {
    const visConfig = { dimensions: {} } as any;
    visConfig.dimensions.metrics = schemas.metric;
    if (schemas.group) {
      visConfig.dimensions.bucket = schemas.group[0];
    }
    return visConfig;
  },
  tagcloud: schemas => {
    const visConfig = {} as any;
    visConfig.metric = schemas.metric[0];
    if (schemas.segment) {
      visConfig.bucket = schemas.segment[0];
    }
    return visConfig;
  },
  region_map: schemas => {
    const visConfig = {} as any;
    visConfig.metric = schemas.metric[0];
    if (schemas.segment) {
      visConfig.bucket = schemas.segment[0];
    }
    return visConfig;
  },
  tile_map: schemas => {
    const visConfig = {} as any;
    visConfig.dimensions = {
      metric: schemas.metric[0],
      geohash: schemas.segment ? schemas.segment[0] : null,
      geocentroid: schemas.geo_centroid ? schemas.geo_centroid[0] : null,
    };
    return visConfig;
  },
  pie: schemas => {
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

/** @internal */
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
  const { uiState } = vis;

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
    pipeline += buildPipelineVisFunction[vis.type.name](vis.params, schemas, uiState);
  } else if (vislibCharts.includes(vis.type.name)) {
    const visConfig = { ...vis.params };
    visConfig.dimensions = await buildVislibDimensions(vis, params);

    pipeline += `vislib type='${vis.type.name}' ${prepareJson('visConfig', visConfig)}`;
  } else if (vis.type.toExpression) {
    pipeline += await vis.type.toExpression(vis, params);
  } else {
    const visConfig = { ...vis.params };
    visConfig.dimensions = schemas;
    pipeline += `visualization type='${vis.type.name}'
    ${prepareJson('visConfig', visConfig)}
    metricsAtAllLevels=${vis.isHierarchical()}
    partialRows=${vis.type.requiresPartialRows || vis.params.showPartialRows || false} `;
    if (indexPattern) {
      pipeline += `${prepareString('index', indexPattern.id)}`;
    }
  }

  return pipeline;
};

export async function buildVisExpression(
  vis: Vis,
  params: {
    timefilter: TimefilterContract;
    timeRange?: TimeRange;
    abortSignal?: AbortSignal;
  }
) {
  const { indexPattern, savedSearchId, searchSource } = vis.data;
  const { uiState } = vis;
  const query = searchSource!.getField('query');
  const filters = searchSource!.getField('filter');

  // context
  const pipeline = buildExpression([buildExpressionFunction('kibana', {})]);
  const kibanaContext = buildExpressionFunction('kibana_context', {});

  if (query && typeof query === 'string') {
    // TODO:
    // The typings for `Query` are `string | { [key: string]: any }
    // Will it ever be in object format when coming from vis.data?
    kibanaContext.addArgument('q', query);
  }

  if (filters) {
    kibanaContext.addArgument('filters', JSON.stringify(filters));
  }

  if (savedSearchId) {
    kibanaContext.addArgument('savedSearchId', savedSearchId);
  }

  // request handler
  if (vis.type.requestHandler === 'courier' && indexPattern?.id) {
    pipeline.functions.push(
      buildExpressionFunction('esaggs', {
        index: indexPattern.id,
        metricsAtAllLevels: vis.isHierarchical(),
        partialRows: vis.type.requiresPartialRows || vis.params.showPartialRows || false,
        aggConfigs: JSON.stringify(vis.data.aggs?.aggs || '[]'),
      })
    );
  }

  const schemas = getSchemas(vis, {
    timeRange: params.timeRange,
    timefilter: params.timefilter,
  });

  if (buildPipelineVisFunction[vis.type.name]) {
    // TODO: temporarily parsing string here
    const { chain } = parseExpression(
      buildPipelineVisFunction[vis.type.name](vis.params, schemas, uiState)
    );
    chain.forEach(({ function: fnName, arguments: args }) =>
      pipeline.functions.push(buildExpressionFunction(fnName, args))
    );
  } else if (vislibCharts.includes(vis.type.name)) {
    const visConfig = { ...vis.params };
    visConfig.dimensions = await buildVislibDimensions(vis, params);

    pipeline.functions.push(
      buildExpressionFunction('vislib', {
        type: vis.type.name,
        visConfig: JSON.stringify(visConfig),
      })
    );
  } else if (vis.type.toExpression) {
    pipeline.functions.push(await vis.type.toExpression(vis, params));
  } else {
    const visConfig = { ...vis.params };
    visConfig.dimensions = schemas;

    const visFn = buildExpressionFunction('visualization', {
      type: vis.type.name,
      visConfig: JSON.stringify(visConfig),
      metricsAtAllLevels: vis.isHierarchical(),
      partialRows: vis.type.requiresPartialRows || vis.params.showPartialRows || false,
    });

    if (indexPattern) {
      visFn.addArgument('index', indexPattern.id);
    }

    pipeline.functions.push(visFn);
  }

  return pipeline.toString();
}
