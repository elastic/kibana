/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FormBasedPersistedState,
  FormulaPublicApi,
  XYState,
  XYReferenceLineLayerConfig,
  XYDataLayerConfig,
  PersistedIndexPatternLayer,
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
  mapToFormula,
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
    axisTitlesVisibilitySettings: {
      x: config.axisTitleVisibility?.showXAxisTitle ?? true,
      yLeft: config.axisTitleVisibility?.showYAxisTitle ?? true,
      yRight: true,
    },
    legend: {
      isVisible: config.legend?.show ?? true,
      position: config.legend?.position ?? 'left',
    },
    hideEndzones: true,
    preferredSeriesType: 'line',
    valueLabels: 'hide',
    emphasizeFitting: config?.emphasizeFitting ?? false,
    fittingFunction: config?.fittingFunction ?? 'None',
    yLeftExtent: {
      mode: config.yBounds?.mode ?? 'full',
      lowerBound: config.yBounds?.lowerBound,
      upperBound: config.yBounds?.upperBound,
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
            accessors: layer.yAxis.map((_, index) => `${ACCESSOR}${i}_${index}`),
            yConfig: layer.yAxis.map((yAxis, index) => ({
              forAccessor: `${ACCESSOR}${i}_${index}`,
              axisMode: 'left',
              color: yAxis.seriesColor,
            })),
          } as XYReferenceLineLayerConfig;
        case 'series':
          return {
            layerId: `layer_${i}`,
            layerType: 'data',
            xAccessor: `x_${ACCESSOR}${i}`,
            ...(layer.breakdown
              ? {
                  splitAccessor: `y_${ACCESSOR}${i}`,
                }
              : {}),
            accessors: layer.yAxis.map((_, index) => `${ACCESSOR}${i}_${index}`),
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
    getValueColumn(`x_${ACCESSOR}${i}`, layer.xAxis as string),
    ...layer.yAxis.map((yAxis, index) => ({
      ...getValueColumn(`${ACCESSOR}${i}_${index}`, yAxis.value, 'number'),
    })),
  ];
}

function buildAllFormulasInLayer(
  layer: LensSeriesLayer | LensAnnotationLayer | LensReferenceLineLayer,
  i: number,
  dataView: DataView,
  formulaAPI?: FormulaPublicApi
): PersistedIndexPatternLayer {
  return layer.yAxis.reduce((acc, curr, valueIndex) => {
    const formulaColumn = getFormulaColumn(
      `${ACCESSOR}${i}_${valueIndex}`,
      mapToFormula(curr),
      dataView,
      formulaAPI,
      valueIndex > 0 ? acc : undefined
    );
    return { ...acc, ...formulaColumn };
  }, {} as PersistedIndexPatternLayer);
}

function buildFormulaLayer(
  layer: LensSeriesLayer | LensAnnotationLayer | LensReferenceLineLayer,
  i: number,
  dataView: DataView,
  formulaAPI?: FormulaPublicApi
): FormBasedPersistedState['layers'][0] {
  if (layer.type === 'series') {
    const resultLayer = buildAllFormulasInLayer(layer, i, dataView, formulaAPI);

    if (layer.xAxis) {
      const columnName = `x_${ACCESSOR}${i}`;
      const breakdownColumn = getBreakdownColumn({
        options: layer.xAxis,
        dataView,
      });
      addLayerColumn(resultLayer, columnName, breakdownColumn, true);
    }

    if (layer.breakdown) {
      const columnName = `y_${ACCESSOR}${i}`;
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
    return buildAllFormulasInLayer(layer, i, dataView, formulaAPI);
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
