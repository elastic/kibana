/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  BuildDependencies,
  DEFAULT_LAYER_ID,
  LensAttributes,
  LensBaseConfig,
  LensXYConfig
} from "../types";
import {
  FormBasedPersistedState,
  FormulaPublicApi,
  XYState,
  XYReferenceLineLayerConfig,
  XYDataLayerConfig,
} from "@kbn/lens-plugin/public";
import {addLayerColumn, getAdhocDataView, getDataView, getDefaultReferences} from "../utils";
import {getBreakdownColumn, getFormulaColumn} from "../columns";
import {DataView, DataViewsPublicPluginStart} from "@kbn/data-views-plugin/public";
import {XYByValueAnnotationLayerConfig} from "@kbn/lens-plugin/public/visualizations/xy/types";
import {QueryPointEventAnnotationConfig} from "@kbn/event-annotation-common";

const ACCESSOR = 'metric_formula_accessor';

function buildVisualizationState(config: LensXYConfig & LensBaseConfig): XYState {
  return {
    legend: {
      isVisible: config.legend?.show || true,
      position: config.legend?.position || 'left',
    },
    preferredSeriesType: 'line',
    valueLabels: "hide",
    fittingFunction: "None",
    axisTitlesVisibilitySettings: {
      x: true,
      yLeft: true,
      yRight: true
    },
    tickLabelsVisibilitySettings: {
      x: true,
      yLeft: true,
      yRight: true
    },
    labelsOrientation: {
      x: 0,
      yLeft: 0,
      yRight: 0
    },
    gridlinesVisibilitySettings: {
      x: true,
      yLeft: true,
      yRight: true
    },
    layers: config.layers.map((layer, i) => {
      switch (layer.type) {
        case 'annotation':
          return {
            layerId: `${DEFAULT_LAYER_ID}${i}`,
            layerType: 'annotations',
            annotations: layer.events.map((e, i) => {
              if ('datetime' in e) {
                return {
                  type: 'manual',
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
                  id: `event${i}`,
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
                    language: 'kql',
                  },
                  ...(e.field ? { timeField: e.field } : {}),
                } as QueryPointEventAnnotationConfig;
              }
            }),
            ignoreGlobalFilters: true,
          } as XYByValueAnnotationLayerConfig;
        case 'reference':
          return {
            layerId: `${DEFAULT_LAYER_ID}${i}`,
            layerType: 'referenceLine',
            accessors: [`${ACCESSOR}${i}`],
            yConfig: [{
              forAccessor: `${ACCESSOR}${i}`,
              axisMode: 'left',
            }],
          } as XYReferenceLineLayerConfig;
        case 'series':
          return {
            layerId: `${DEFAULT_LAYER_ID}${i}`,
            layerType: 'data',
            xAccessor: `${ACCESSOR}${i}_x`,
            ...(layer.breakdown ? {
              splitAccessor: `${ACCESSOR}${i}_y}`,
            } : {}),
            accessors: [`${ACCESSOR}${i}`],
            seriesType: layer.seriesType || 'line',
          } as XYDataLayerConfig;
      }

    })
  }
}

function buildReferences(config: LensXYConfig, dataviews: Record<string, DataView>) {
  const references = [];
  for (let layerid in dataviews) {
    references.push(...getDefaultReferences(dataviews[layerid].id!, layerid));
  }
  return references.flat();
}

async function buildLayers(
  config: LensXYConfig & LensBaseConfig,
  mainDataView: DataView | undefined,
  formulaAPI: FormulaPublicApi,
  dataViews: DataViewsPublicPluginStart,
  dataviews: Record<string, DataView>
): Promise<FormBasedPersistedState['layers']> {
  const layers: FormBasedPersistedState['layers'] = {}
  let i = 0;
  for (let layer of config.layers) {
    const layerId = `${DEFAULT_LAYER_ID}${i}`;
    if (layer.type === 'series') {
      let dataView = mainDataView;
      if (layer.index) {
        dataView = await getDataView(layer.index, dataViews, layer.timeFieldName)
      }

      if (!dataView) {
        throw (`index must be provided as either config.index or layer.index`)
      }

      dataviews[layerId] = dataView;

      layers[layerId] = {
        ...getFormulaColumn(
          `${ACCESSOR}${i}`, {
            value: layer.query,
          },
          dataView, formulaAPI
        ),
      };

      const defaultLayer = layers[layerId];

      if (layer.xAxis) {
        const columnName = `${ACCESSOR}${i}_x`;
        const breakdownColumn = getBreakdownColumn({
          options: layer.xAxis,
          dataView
        });
        addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
      }

      if (layer.breakdown) {
        const columnName = `${ACCESSOR}${i}_y`;
        const breakdownColumn = getBreakdownColumn({
          options: layer.breakdown,
          dataView
        });
        addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
      }
    } else if (layer.type === 'annotation') {
      let dataView = mainDataView;
      if (layer.index) {
        dataView = await getDataView(layer.index, dataViews, layer.timeFieldName)
      }

      if (!dataView) {
        throw (`index must be provided as either config.index or layer.index`)
      }

      dataviews[layerId] = dataView;
    } else if (layer.type === 'reference') {
      let dataView = mainDataView;
      if (layer.index) {
        dataView = await getDataView(layer.index, dataViews, layer.timeFieldName)
      }

      if (!dataView) {
        throw (`index must be provided as either config.index or layer.index`)
      }

      dataviews[layerId] = dataView;

      layers[layerId] = {
        ...getFormulaColumn(
            `${ACCESSOR}${i}`, {
              value: layer.query,
            },
            dataView, formulaAPI
        ),
      };
    }
    i++;
  }

  return layers;
}

export async function buildXY(config: LensXYConfig & LensBaseConfig, {
  dataViewsAPI, formulaAPI
}: BuildDependencies): Promise<LensAttributes> {

  const dataviews: Record<string, DataView> = {};
  let dataView: DataView | undefined = undefined;
  if (config.index) {
    dataView = await getDataView(config.index, dataViewsAPI, config.timeFieldName);
  }

  const layers = await buildLayers(config, dataView, formulaAPI, dataViewsAPI, dataviews);
  const references = buildReferences(config, dataviews);
  let adHocDataViews = {};
  [... new Set(Object.values(dataviews))].forEach(d => {
    adHocDataViews = {
      ...adHocDataViews,
      ...getAdhocDataView(d),
    }
  })

  return {
    title: config.title,
    visualizationType: 'lnsXY',
    references,
    state: {
      datasourceStates: {
        formBased: {
          layers,
        },
      },
      internalReferences: [],
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: buildVisualizationState(config),
      // Getting the spec from a data view is a heavy operation, that's why the result is cached.
      adHocDataViews,
    },
  };
}
