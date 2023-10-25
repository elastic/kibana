/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {BuildDependencies, DEFAULT_LAYER_ID, LensAttributes, LensBaseConfig, LensMetricConfig} from "../types";
import {
  FormBasedPersistedState,
  FormulaPublicApi,
  MetricVisualizationState,
  PersistedIndexPatternLayer
} from "@kbn/lens-plugin/public";
import {addLayerColumn, addLayerFormulaColumns, getAdhocDataView, getDataView, getDefaultReferences} from "../utils";
import {getBreakdownColumn, getFormulaColumn, getHistogramColumn} from "../columns";
import {DataView} from "@kbn/data-views-plugin/public";

const ACCESSOR = 'metric_formula_accessor';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';
const TRENDLINE_LAYER_ID = `layer_trendline`;

function buildVisualizationState(config: LensMetricConfig & LensBaseConfig): MetricVisualizationState {
    if (config.layers.length !== 1) throw('metric must define a single layer');

    const layer = config.layers[0];

    return {
        layerId: DEFAULT_LAYER_ID,
        layerType: 'data',
        metricAccessor: ACCESSOR,
        color: layer.seriesColor,
        // subtitle: layer.subtitle,
        showBar: false,

        ...(layer.querySecondaryMetric ? {
          secondaryMetricAccessor: `${ACCESSOR}_secondary`,
        } : {}),

        ...(layer.queryMaxValue ? {
          maxAccessor: `${ACCESSOR}_max`,
          showBar: true,
        } : {}),

        ...(layer.breakdown ? {
          breakdownByAccessor: `${ACCESSOR}_breakdown`,
        } : {}),

        ...(layer.trendLine
            ? {
                trendlineLayerId: `${DEFAULT_LAYER_ID}_trendline`,
                trendlineLayerType: 'metricTrendline',
                trendlineMetricAccessor: `${ACCESSOR}_trendline`,
                trendlineTimeAccessor: HISTOGRAM_COLUMN_NAME,
                ...(layer.querySecondaryMetric ? {
                  trendlineSecondaryMetricAccessor: `${ACCESSOR}_secondary_trendline`,
                } : {}),

                ...(layer.queryMaxValue ? {
                  trendlineMaxAccessor: `${ACCESSOR}_max_trendline`,
                } : {}),

                ...(layer.breakdown ? {
                  trendlineBreakdownByAccessor: `${ACCESSOR}_breakdown_trendline`,
                } : {}),
            }
            : {}),
    };
}

function buildReferences(config: LensMetricConfig, dataview: DataView) {
    const references = getDefaultReferences(dataview.id!, DEFAULT_LAYER_ID);

    if (config.layers[0].trendLine) {
      references.push(...getDefaultReferences(dataview.id!, TRENDLINE_LAYER_ID));
    }

    return references.flat();
}

function buildLayers(config: LensMetricConfig & LensBaseConfig, dataView: DataView, formulaAPI: FormulaPublicApi): FormBasedPersistedState['layers'] {
    const layer = config.layers[0];

    const baseLayer: PersistedIndexPatternLayer = {
        columnOrder: [ACCESSOR, HISTOGRAM_COLUMN_NAME],
        columns: {
          [HISTOGRAM_COLUMN_NAME] :
            getHistogramColumn({
             options: {
               sourceField: dataView.timeFieldName,
               params: {
                 interval: 'auto',
                 includeEmptyRows: true,
               },
             },
           })
        },
        sampling: 1,
    };

    const layers: { layer: PersistedIndexPatternLayer, layer_trendline?: PersistedIndexPatternLayer } = {
        [DEFAULT_LAYER_ID]: {
          ...getFormulaColumn(
            ACCESSOR, {
              value: layer.query,
            },
            dataView, formulaAPI
          ),
        },
        ...(layer.trendLine ? {
            [TRENDLINE_LAYER_ID]: {
                linkToLayers: [DEFAULT_LAYER_ID],
                ...getFormulaColumn(
                    `${ACCESSOR}_trendline`,
                  { value: layer.query },
                    dataView,
                    formulaAPI,
                    baseLayer,
                ),
            },
        } : {}),
    };

    const defaultLayer = layers[DEFAULT_LAYER_ID];
    const trendLineLayer = layers[TRENDLINE_LAYER_ID];

    if (layer.breakdown) {
      const columnName = `${ACCESSOR}_breakdown`;
      const breakdownColumn = getBreakdownColumn({
        options: layer.breakdown,
        dataView
      });
      addLayerColumn(defaultLayer, columnName, breakdownColumn, true);

      if (trendLineLayer) {
        addLayerColumn(trendLineLayer, `${columnName}_trendline`, breakdownColumn, true);
      }
    }

    if (layer.querySecondaryMetric) {
      const columnName = `${ACCESSOR}_secondary`;
      const formulaColumn = getFormulaColumn(
        columnName, {
          value: layer.querySecondaryMetric
        }, dataView, formulaAPI
      );

      addLayerFormulaColumns(defaultLayer, formulaColumn);
      if (trendLineLayer) {
        addLayerFormulaColumns(trendLineLayer, formulaColumn, 'X0')
      }
    }

    if (layer.queryMaxValue) {
      const columnName = `${ACCESSOR}_max`;
      const formulaColumn = getFormulaColumn(
        columnName, {
          value: layer.queryMaxValue
        }, dataView, formulaAPI
      );

      addLayerFormulaColumns(defaultLayer, formulaColumn);
      if (trendLineLayer) {
        addLayerFormulaColumns(trendLineLayer, formulaColumn, 'X0')
      }
    }

    return layers;
}

export async function buildMetric(config: LensMetricConfig & LensBaseConfig, {
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
        visualizationType: 'lnsMetric',
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
