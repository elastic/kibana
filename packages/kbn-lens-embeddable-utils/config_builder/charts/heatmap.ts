/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {BuildDependencies, DEFAULT_LAYER_ID, LensAttributes, LensBaseConfig, LensHeatmapConfig} from "../types";
import {
  FormBasedPersistedState,
  FormulaPublicApi,
  HeatmapVisualizationState,
} from "@kbn/lens-plugin/public";
import {addLayerColumn, getAdhocDataView, getDataView, getDefaultReferences} from "../utils";
import {getBreakdownColumn, getFormulaColumn} from "../columns";
import {DataView} from "@kbn/data-views-plugin/public";

const ACCESSOR = 'metric_formula_accessor';

function buildVisualizationState(config: LensHeatmapConfig & LensBaseConfig): HeatmapVisualizationState {
  if (config.layers.length !== 1) throw('metric must define a single layer');

  const layer = config.layers[0];

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    shape: 'heatmap',
    valueAccessor: ACCESSOR,
    ...(layer.xAxis ? {
      xAccessor: `${ACCESSOR}_x`,
    } : {}),

    ...(layer.breakdown ? {
      yAccessor: `${ACCESSOR}_y`,
    } : {}),
    gridConfig: {
      type: 'heatmap_grid',
      isCellLabelVisible: false,
      isXAxisLabelVisible: false,
      isXAxisTitleVisible: false,
      isYAxisLabelVisible: false,
      isYAxisTitleVisible: false,
    },
    legend: {
      isVisible: config.legend?.show || true,
      position: config.legend?.position || 'left',
      type: 'heatmap_legend',
    }
  };
}

function buildReferences(config: LensHeatmapConfig, dataview: DataView) {
  const references = getDefaultReferences(dataview.id!, DEFAULT_LAYER_ID);
  return references.flat();
}

function buildLayers(config: LensHeatmapConfig & LensBaseConfig, dataView: DataView, formulaAPI: FormulaPublicApi): FormBasedPersistedState['layers'] {
  const layer = config.layers[0];

  const layers = {
    [DEFAULT_LAYER_ID]: {
      ...getFormulaColumn(
        ACCESSOR, {
          value: layer.query,
        },
        dataView, formulaAPI
      ),
    },
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];

  if (layer.xAxis) {
    const columnName = `${ACCESSOR}_x`;
    const breakdownColumn = getBreakdownColumn({
      options: layer.xAxis,
      dataView
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  }

  if (layer.breakdown) {
    const columnName = `${ACCESSOR}_y`;
    const breakdownColumn = getBreakdownColumn({
      options: layer.breakdown,
      dataView
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  }

  return layers;
}

export async function buildHeatmap(config: LensHeatmapConfig & LensBaseConfig, {
  dataViewsAPI, formulaAPI
}: BuildDependencies): Promise<LensAttributes> {

  let dataView: DataView | undefined = undefined;
  if (config.index) {
    dataView = await getDataView(config.index, dataViewsAPI, config.timeFieldName);
  }
  if (config.layers[0].index) {
    dataView = await getDataView(config.layers[0].index, dataViewsAPI, config.layers[0].timeFieldName);
  }

  if (!dataView) {
    throw `index pattern must be provided for formula queries either at config.index or config.layer[0].index `;
  }

  const references = buildReferences(config, dataView);

  return {
    title: config.title,
    visualizationType: 'lnsHeatmap',
    references,
    state: {
      datasourceStates: {
        formBased: {
          layers: buildLayers(config, dataView, formulaAPI),
        },
      },
      internalReferences: [],
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: buildVisualizationState(config),
      // Getting the spec from a data view is a heavy operation, that's why the result is cached.
      adHocDataViews: {
        ...getAdhocDataView(dataView),
      },
    },
  };
}
