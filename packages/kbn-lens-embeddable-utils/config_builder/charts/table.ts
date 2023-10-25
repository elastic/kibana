/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {BuildDependencies, DEFAULT_LAYER_ID, LensAttributes, LensBaseConfig, LensTableConfig} from "../types";
import {
  FormBasedPersistedState,
  FormulaPublicApi,
  DatatableVisualizationState,
} from "@kbn/lens-plugin/public";
import {addLayerColumn, getAdhocDataView, getDataView, getDefaultReferences} from "../utils";
import {getBreakdownColumn, getFormulaColumn} from "../columns";
import {DataView} from "@kbn/data-views-plugin/public";

const ACCESSOR = 'metric_formula_accessor';

function buildVisualizationState(config: (LensTableConfig) & LensBaseConfig): DatatableVisualizationState {
    if (config.layers.length !== 1) throw('single layer must be defined');

    const layer = config.layers[0];

    return {
        layerId: DEFAULT_LAYER_ID,
        layerType: 'data',
        columns: [
          { columnId: ACCESSOR },
          ...(layer.breakdown || []).map((breakdown, i) => ({ columnId: `${ACCESSOR}_breakdown_${i}` })),
          ...(layer.splitBy || []).map((breakdown, i) => ({ columnId: `${ACCESSOR}_splitby_${i}` }))
        ],
    };
}

function buildReferences(config: (LensTableConfig), dataview: DataView) {
    const references = getDefaultReferences(dataview.id!, DEFAULT_LAYER_ID);
    return references.flat();
}

function buildLayers(config: (LensTableConfig) & LensBaseConfig, dataView: DataView, formulaAPI: FormulaPublicApi): FormBasedPersistedState['layers'] {
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

    if (layer.breakdown) {
      layer.breakdown.reverse().forEach((breakdown, i) => {
        const columnName = `${ACCESSOR}_breakdown_${i}`;
        const breakdownColumn = getBreakdownColumn({
          options: breakdown,
          dataView
        });
        addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
      })

    } else {
      throw ('breakdown must be defined!');
    }

  if (layer.splitBy) {
    layer.splitBy.forEach((breakdown, i) => {
      const columnName = `${ACCESSOR}_splitby_${i}`;
      const breakdownColumn = getBreakdownColumn({
        options: breakdown,
        dataView
      });
      addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
    })

  }

    return layers;
}

export async function buildTable(config: (LensTableConfig) & LensBaseConfig, {
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
        visualizationType: 'lnsDatatable',
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
