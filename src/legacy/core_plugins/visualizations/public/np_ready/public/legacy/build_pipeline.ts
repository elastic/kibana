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

import { cloneDeep, get } from 'lodash';
// @ts-ignore
import moment from 'moment';
import { SerializedFieldFormat } from 'src/plugins/expressions/public';
import {
  AggConfig,
  setBounds,
  isDateHistogramBucketAggConfig,
  createFormat,
} from '../../../legacy_imports';
// eslint-disable-next-line
import { SearchSourceContract } from '../../../../../../ui/public/courier/search_source/search_source';
import { Vis, VisParams, VisState } from '..';

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

type buildVisFunction = (visState: VisState, schemas: Schemas, uiState: any) => string;
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

export const getSchemas = (vis: Vis, timeRange?: any): Schemas => {
  const createSchemaConfig = (accessor: number, agg: AggConfig): SchemaConfig => {
    if (isDateHistogramBucketAggConfig(agg)) {
      agg.params.timeRange = timeRange;
      setBounds(agg, true);
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

    const format = createFormat(
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
  const responseAggs = vis.aggs.getResponseAggs().filter((agg: AggConfig) => agg.enabled);
  const isHierarchical = vis.isHierarchical();
  const metrics = responseAggs.filter((agg: AggConfig) => agg.type.type === 'metrics');
  responseAggs.forEach((agg: AggConfig) => {
    let skipMetrics = false;
    let schemaName = agg.schema ? agg.schema.name || agg.schema : null;
    if (typeof schemaName === 'object') {
      schemaName = null;
    }
    if (!schemaName) {
      if (agg.type.name === 'geo_centroid') {
        schemaName = 'geo_centroid';
      } else {
        cnt++;
        return;
      }
    }
    if (schemaName === 'split') {
      schemaName = `split_${agg.params.row ? 'row' : 'column'}`;
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
  const visState = vis.getCurrentState();
  const visConfig = visState.params;
  const responseAggs = vis.aggs.getResponseAggs().filter((agg: AggConfig) => agg.enabled);

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
  vega: visState => {
    return `vega ${prepareString('spec', visState.params.spec)}`;
  },
  input_control_vis: visState => {
    return `input_control_vis ${prepareJson('visConfig', visState.params)}`;
  },
  metrics: (visState, schemas, uiState = {}) => {
    const paramsJson = prepareJson('params', visState.params);
    const uiStateJson = prepareJson('uiState', uiState);

    return `tsvb ${paramsJson} ${uiStateJson}`;
  },
  timelion: visState => {
    const expression = prepareString('expression', visState.params.expression);
    const interval = prepareString('interval', visState.params.interval);
    return `timelion_vis ${expression}${interval}`;
  },
  markdown: visState => {
    const { markdown, fontSize, openLinksInNewTab } = visState.params;
    let escapedMarkdown = '';
    if (typeof markdown === 'string' || markdown instanceof String) {
      escapedMarkdown = escapeString(markdown.toString());
    }
    let expr = `markdownvis '${escapedMarkdown}' `;
    expr += prepareValue('font', `{font size=${fontSize}}`, true);
    expr += prepareValue('openLinksInNewTab', openLinksInNewTab);
    return expr;
  },
  table: (visState, schemas) => {
    const visConfig = {
      ...visState.params,
      ...buildVisConfig.table(schemas, visState.params),
    };
    return `kibana_table ${prepareJson('visConfig', visConfig)}`;
  },
  metric: (visState, schemas) => {
    const {
      percentageMode,
      useRanges,
      colorSchema,
      metricColorMode,
      colorsRange,
      labels,
      invertColors,
      style,
    } = visState.params.metric;
    const { metrics, bucket } = buildVisConfig.metric(schemas).dimensions;

    // fix formatter for percentage mode
    if (get(visState.params, 'metric.percentageMode') === true) {
      metrics.forEach((metric: SchemaConfig) => {
        metric.format = { id: 'percent' };
      });
    }

    let expr = `metricvis `;
    expr += prepareValue('percentage', percentageMode);
    expr += prepareValue('colorScheme', colorSchema);
    expr += prepareValue('colorMode', metricColorMode);
    expr += prepareValue('useRanges', useRanges);
    expr += prepareValue('invertColors', invertColors);
    expr += prepareValue('showLabels', labels && labels.show);
    if (style) {
      expr += prepareValue('bgFill', style.bgFill);
      expr += prepareValue('font', `{font size=${style.fontSize}}`, true);
      expr += prepareValue('subText', style.subText);
      expr += prepareDimension('bucket', bucket);
    }

    if (colorsRange) {
      colorsRange.forEach((range: any) => {
        expr += prepareValue('colorRange', `{range from=${range.from} to=${range.to}}`, true);
      });
    }

    metrics.forEach((metric: SchemaConfig) => {
      expr += prepareDimension('metric', metric);
    });

    return expr;
  },
  tagcloud: (visState, schemas) => {
    const { scale, orientation, minFontSize, maxFontSize, showLabel } = visState.params;
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
  region_map: (visState, schemas) => {
    const visConfig = {
      ...visState.params,
      ...buildVisConfig.region_map(schemas),
    };
    return `regionmap ${prepareJson('visConfig', visConfig)}`;
  },
  tile_map: (visState, schemas) => {
    const visConfig = {
      ...visState.params,
      ...buildVisConfig.tile_map(schemas),
    };
    return `tilemap ${prepareJson('visConfig', visConfig)}`;
  },
  pie: (visState, schemas) => {
    const visConfig = {
      ...visState.params,
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

export const buildVislibDimensions = async (
  vis: any,
  params: { searchSource: any; timeRange?: any; abortSignal?: AbortSignal }
) => {
  const schemas = getSchemas(vis, params.timeRange);
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
    const xAgg = vis.aggs.getResponseAggs()[dimensions.x.accessor];
    if (xAgg.type.name === 'date_histogram') {
      dimensions.x.params.date = true;
      const { esUnit, esValue } = xAgg.buckets.getInterval();
      dimensions.x.params.interval = moment.duration(esValue, esUnit);
      dimensions.x.params.format = xAgg.buckets.getScaledDateFormat();
      dimensions.x.params.bounds = xAgg.buckets.getBounds();
    } else if (xAgg.type.name === 'histogram') {
      const intervalParam = xAgg.type.paramByName('interval');
      const output = { params: {} as any };
      await intervalParam.modifyAggConfigOnSearchRequestStart(xAgg, params.searchSource, {
        abortSignal: params.abortSignal,
      });
      intervalParam.write(xAgg, output);
      dimensions.x.params.interval = output.params.interval;
    }
  }

  adjustVislibDimensionFormmaters(vis, dimensions);
  return dimensions;
};

// If not using the expression pipeline (i.e. visualize_data_loader), we need a mechanism to
// take a Vis object and decorate it with the necessary params (dimensions, bucket, metric, etc)
export const getVisParams = async (
  vis: Vis,
  params: { searchSource: SearchSourceContract; timeRange?: any; abortSignal?: AbortSignal }
) => {
  const schemas = getSchemas(vis, params.timeRange);
  let visConfig = cloneDeep(vis.params);
  if (buildVisConfig[vis.type.name]) {
    visConfig = {
      ...visConfig,
      ...buildVisConfig[vis.type.name](schemas, visConfig),
    };
  } else if (vislibCharts.includes(vis.type.name)) {
    visConfig.dimensions = await buildVislibDimensions(vis, params);
  }
  return visConfig;
};

export const buildPipeline = async (
  vis: Vis,
  params: {
    searchSource: SearchSourceContract;
    timeRange?: any;
  }
) => {
  const { searchSource } = params;
  const { indexPattern } = vis;
  const query = searchSource.getField('query');
  const filters = searchSource.getField('filter');
  const visState = vis.getCurrentState();
  const uiState = vis.getUiState();

  // context
  let pipeline = `kibana | kibana_context `;
  if (query) {
    pipeline += prepareJson('query', query);
  }
  if (filters) {
    pipeline += prepareJson('filters', filters);
  }
  if (vis.savedSearchId) {
    pipeline += prepareString('savedSearchId', vis.savedSearchId);
  }
  pipeline += '| ';

  // request handler
  if (vis.type.requestHandler === 'courier') {
    pipeline += `esaggs
    ${prepareString('index', indexPattern.id)}
    metricsAtAllLevels=${vis.isHierarchical()}
    partialRows=${vis.type.requiresPartialRows || vis.params.showPartialRows || false}
    ${prepareJson('aggConfigs', visState.aggs)} | `;
  }

  const schemas = getSchemas(vis, params.timeRange);
  if (buildPipelineVisFunction[vis.type.name]) {
    pipeline += buildPipelineVisFunction[vis.type.name](visState, schemas, uiState);
  } else if (vislibCharts.includes(vis.type.name)) {
    const visConfig = visState.params;
    visConfig.dimensions = await buildVislibDimensions(vis, params);

    pipeline += `vislib type='${vis.type.name}' ${prepareJson('visConfig', visState.params)}`;
  } else if (vis.type.toExpression) {
    pipeline += await vis.type.toExpression(vis, params);
  } else {
    const visConfig = visState.params;
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
