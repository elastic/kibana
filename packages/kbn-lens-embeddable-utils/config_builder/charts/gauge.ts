/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {BuildDependencies, DEFAULT_LAYER_ID, LensAttributes, LensBaseConfig, LensGaugeConfig} from "../types";
import {
  FormBasedPersistedState,
  FormulaPublicApi,
  GaugeVisualizationState,
} from "@kbn/lens-plugin/public";
import {addLayerFormulaColumns, getAdhocDataView, getDataView, getDefaultReferences} from "../utils";
import {getFormulaColumn} from "../columns";
import {DataView} from "@kbn/data-views-plugin/public";

const ACCESSOR = 'metric_formula_accessor';

function buildVisualizationState(config: LensGaugeConfig & LensBaseConfig): GaugeVisualizationState {
    if (config.layers.length !== 1) throw('metric must define a single layer');

    const layer = config.layers[0];

    return {
        layerId: DEFAULT_LAYER_ID,
        layerType: 'data',
        showBar: false,
        ticksPosition: 'auto',
        shape: layer.shape || 'horizontalBullet',
        labelMajorMode: 'auto',
        metricAccessor: ACCESSOR,
        ...(layer.queryGoalValue ? {
          goalAccessor: `${ACCESSOR}_goal`,
        } : {}),

        ...(layer.queryMaxValue ? {
          maxAccessor: `${ACCESSOR}_max`,
          showBar: true,
        } : {}),

        ...(layer.queryMinValue ? {
          minAccessor: `${ACCESSOR}_min`,
        } : {}),
    };
}

function buildReferences(config: LensGaugeConfig, dataview: DataView) {
    const references = getDefaultReferences(dataview.id!, DEFAULT_LAYER_ID);
    return references.flat();
}

function buildLayers(config: LensGaugeConfig & LensBaseConfig, dataView: DataView, formulaAPI: FormulaPublicApi): FormBasedPersistedState['layers'] {
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

    if (layer.queryGoalValue) {
      const columnName = `${ACCESSOR}_goal`;
      const formulaColumn = getFormulaColumn(
        columnName, {
          value: layer.queryGoalValue
        }, dataView, formulaAPI
      );

      addLayerFormulaColumns(defaultLayer, formulaColumn);
    }

    if (layer.queryMinValue) {
      const columnName = `${ACCESSOR}_min`;
      const formulaColumn = getFormulaColumn(
        columnName, {
          value: layer.queryMinValue
        }, dataView, formulaAPI
      );

      addLayerFormulaColumns(defaultLayer, formulaColumn);
    }

    if (layer.queryMaxValue) {
      const columnName = `${ACCESSOR}_max`;
      const formulaColumn = getFormulaColumn(
        columnName, {
          value: layer.queryMaxValue
        }, dataView, formulaAPI
      );

      addLayerFormulaColumns(defaultLayer, formulaColumn);
    }

    return layers;
}

export async function buildGauge(config: LensGaugeConfig & LensBaseConfig, {
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
        visualizationType: 'lnsGauge',
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
