/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  FormBasedPersistedState,
  FormulaPublicApi,
  XYState,
  XYReferenceLineLayerConfig,
  XYDataLayerConfig,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { XYByValueAnnotationLayerConfig } from '@kbn/lens-plugin/public/visualizations/xy/types';
import type { QueryPointEventAnnotationConfig } from '@kbn/event-annotation-common';
import { getBreakdownColumn, getFormulaColumn, getValueColumn } from '../columns';
import {
  addLayerColumn,
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
} from '../utils';
import {
  BuildDependencies,
  LensAnnotationLayer,
  LensAttributes,
  LensReferenceLineLayer,
  LensSeriesLayer,
  LensXYConfig,
} from '../types';

const ACCESSOR = 'metric_formula_accessor';

function buildVisualizationState(config: LensXYConfig): XYState {
  return {
    legend: {
      isVisible: config.legend?.show || true,
      position: config.legend?.position || 'left',
    },
    preferredSeriesType: 'line',
    valueLabels: 'hide',
    fittingFunction: 'None',
    axisTitlesVisibilitySettings: {
      x: true,
      yLeft: true,
      yRight: true,
    },
    tickLabelsVisibilitySettings: {
      x: true,
      yLeft: true,
      yRight: true,
    },
    labelsOrientation: {
      x: 0,
      yLeft: 0,
      yRight: 0,
    },
    gridlinesVisibilitySettings: {
      x: true,
      yLeft: true,
      yRight: true,
    },
    layers: config.layers.map((layer, i) => {
      switch (layer.type) {
        case 'annotation':
          return {
            layerId: `layer_${i}`,
            layerType: 'annotations',
            annotations: layer.events.map((e, eventNr) => {
              if ('datetime' in e) {
                return {
                  type: 'manual',
                  id: `annotation_${eventNr}`,
                  icon: e.icon || 'triangle',
                  color: e.color || 'blue',
                  label: e.name,
                  key: {
                    type: 'point_in_time',
                    timestamp: e.datetime,
                  },
                };
              } else {
                return {
                  id: `event${eventNr}`,
                  type: 'query',
                  icon: e.icon || 'triangle',
                  color: e.color || 'blue',
                  label: e.name,
                  key: {
                    type: 'point_in_time',
                  },
                  filter: {
                    type: 'kibana_query',
                    query: e.filter,
                    language: 'kuery',
                  },
                  ...(e.field ? { timeField: e.field } : {}),
                } as QueryPointEventAnnotationConfig;
              }
            }),
            ignoreGlobalFilters: true,
          } as XYByValueAnnotationLayerConfig;
        case 'reference':
          return {
            layerId: `layer_${i}`,
            layerType: 'referenceLine',
            accessors: [`${ACCESSOR}${i}`],
            yConfig: [
              {
                forAccessor: `${ACCESSOR}${i}`,
                axisMode: 'left',
              },
            ],
          } as XYReferenceLineLayerConfig;
        case 'series':
          return {
            layerId: `layer_${i}`,
            layerType: 'data',
            xAccessor: `${ACCESSOR}${i}_x`,
            ...(layer.breakdown
              ? {
                  splitAccessor: `${ACCESSOR}${i}_y}`,
                }
              : {}),
            accessors: [`${ACCESSOR}${i}`],
            seriesType: layer.seriesType || 'line',
          } as XYDataLayerConfig;
      }
    }),
  };
}

function getValueColumns(layer: LensSeriesLayer, i: number) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }
  if (typeof layer.xAxis !== 'string') {
    throw new Error('xAxis must be a field name when not using index source');
  }
  return [
    ...(layer.breakdown
      ? [getValueColumn(`${ACCESSOR}${i}_breakdown`, layer.breakdown as string)]
      : []),
    getValueColumn(`${ACCESSOR}${i}_x`, layer.xAxis as string),
    getValueColumn(`${ACCESSOR}${i}`, layer.value, 'number'),
  ];
}

function buildFormulaLayer(
  layer: LensSeriesLayer | LensAnnotationLayer | LensReferenceLineLayer,
  i: number,
  dataView: DataView,
  formulaAPI: FormulaPublicApi
): FormBasedPersistedState['layers'][0] {
  if (layer.type === 'series') {
    const resultLayer = {
      ...getFormulaColumn(
        `${ACCESSOR}${i}`,
        {
          value: layer.value,
        },
        dataView,
        formulaAPI
      ),
    };

    if (layer.xAxis) {
      const columnName = `${ACCESSOR}${i}_x`;
      const breakdownColumn = getBreakdownColumn({
        options: layer.xAxis,
        dataView,
      });
      addLayerColumn(resultLayer, columnName, breakdownColumn, true);
    }

    if (layer.breakdown) {
      const columnName = `${ACCESSOR}${i}_y`;
      const breakdownColumn = getBreakdownColumn({
        options: layer.breakdown,
        dataView,
      });
      addLayerColumn(resultLayer, columnName, breakdownColumn, true);
    }

    return resultLayer;
  } else if (layer.type === 'annotation') {
    // nothing ?
  } else if (layer.type === 'reference') {
    return {
      ...getFormulaColumn(
        `${ACCESSOR}${i}`,
        {
          value: layer.value,
        },
        dataView,
        formulaAPI
      ),
    };
  }

  return {
    columns: {},
    columnOrder: [],
  };
}

export async function buildXY(
  config: LensXYConfig,
  { dataViewsAPI, formulaAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: any, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg, i, dataView, formulaAPI);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );
  const references = buildReferences(dataviews);

  return {
    title: config.title,
    visualizationType: 'lnsXY',
    references,
    state: {
      datasourceStates,
      internalReferences: [],
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: buildVisualizationState(config),
      // Getting the spec from a data view is a heavy operation, that's why the result is cached.
      adHocDataViews: getAdhocDataviews(dataviews),
    },
  };
}
