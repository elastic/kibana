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
  MetricVisualizationState,
  PersistedIndexPatternLayer,
} from '@kbn/lens-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { BuildDependencies, LensAttributes, LensMetricConfig } from '../types';
import { DEFAULT_LAYER_ID } from '../constants';
import {
  addLayerColumn,
  addLayerFormulaColumns,
  buildDatasourceStates,
  extractReferences,
  mapToFormula,
  mapToValueFormat,
} from '../utils';
import {
  getBreakdownColumn,
  getFormulaColumn,
  getHistogramColumn,
  getValueColumn,
} from '../columns';

const ACCESSOR = 'metric_formula_accessor';
const HISTOGRAM_COLUMN_NAME = 'x_date_histogram';
const TRENDLINE_LAYER_ID = 'layer_0_trendline';

function getAccessorName(type: 'max' | 'breakdown' | 'secondary') {
  return `${ACCESSOR}_${type}`;
}
function buildVisualizationState(config: LensMetricConfig): MetricVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    metricAccessor: ACCESSOR,
    color: layer.seriesColor,
    subtitle: layer.subtitle,
    showBar: false,

    ...(layer.querySecondaryMetric
      ? {
          secondaryMetricAccessor: getAccessorName('secondary'),
        }
      : {}),

    ...(layer.queryMaxValue
      ? {
          maxAccessor: getAccessorName('max'),
          showBar: true,
        }
      : {}),

    ...(layer.breakdown
      ? {
          breakdownByAccessor: getAccessorName('breakdown'),
        }
      : {}),

    ...(layer.trendLine
      ? {
          trendlineLayerId: `${DEFAULT_LAYER_ID}_trendline`,
          trendlineLayerType: 'metricTrendline',
          trendlineMetricAccessor: `${ACCESSOR}_trendline`,
          trendlineTimeAccessor: HISTOGRAM_COLUMN_NAME,
          ...(layer.querySecondaryMetric
            ? {
                trendlineSecondaryMetricAccessor: `${ACCESSOR}_secondary_trendline`,
              }
            : {}),

          ...(layer.queryMaxValue
            ? {
                trendlineMaxAccessor: `${ACCESSOR}_max_trendline`,
              }
            : {}),

          ...(layer.breakdown
            ? {
                trendlineBreakdownByAccessor: `${ACCESSOR}_breakdown_trendline`,
              }
            : {}),
        }
      : {}),
  };
}

function buildFormulaLayer(
  layer: LensMetricConfig,
  i: number,
  dataView: DataView
): FormBasedPersistedState['layers'] {
  const baseLayer: PersistedIndexPatternLayer = {
    columnOrder: [ACCESSOR, HISTOGRAM_COLUMN_NAME],
    columns: {
      [HISTOGRAM_COLUMN_NAME]: getHistogramColumn({
        options: {
          sourceField: dataView.timeFieldName,
          params: {
            interval: 'auto',
            includeEmptyRows: true,
          },
        },
      }),
    },
    sampling: 1,
  };

  const layers: {
    layer_0: PersistedIndexPatternLayer;
    layer_0_trendline?: PersistedIndexPatternLayer;
  } = {
    [DEFAULT_LAYER_ID]: {
      ...getFormulaColumn(ACCESSOR, mapToFormula(layer), dataView),
    },
    ...(layer.trendLine
      ? {
          [TRENDLINE_LAYER_ID]: {
            linkToLayers: [DEFAULT_LAYER_ID],
            ...getFormulaColumn(`${ACCESSOR}_trendline`, mapToFormula(layer), dataView, baseLayer),
          },
        }
      : {}),
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];
  const trendLineLayer = layers[TRENDLINE_LAYER_ID];

  if (layer.breakdown) {
    const columnName = getAccessorName('breakdown');
    const breakdownColumn = getBreakdownColumn({
      options: layer.breakdown,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);

    if (trendLineLayer) {
      addLayerColumn(trendLineLayer, `${columnName}_trendline`, breakdownColumn, true);
    }
  }

  if (layer.querySecondaryMetric) {
    const columnName = getAccessorName('secondary');
    const formulaColumn = getFormulaColumn(
      columnName,
      { formula: layer.querySecondaryMetric },
      dataView
    );

    addLayerFormulaColumns(defaultLayer, formulaColumn);
    if (trendLineLayer) {
      addLayerFormulaColumns(trendLineLayer, formulaColumn, 'X0');
    }
  }

  if (layer.queryMaxValue) {
    const columnName = getAccessorName('max');
    const formulaColumn = getFormulaColumn(columnName, { formula: layer.queryMaxValue }, dataView);

    addLayerFormulaColumns(defaultLayer, formulaColumn);
    if (trendLineLayer) {
      addLayerFormulaColumns(trendLineLayer, formulaColumn, 'X0');
    }
  }

  return layers;
}

function getValueColumns(layer: LensMetricConfig) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }
  // For the ES|QL/text-based path, format hints (`percent`, `bytes`, …)
  // and the human-readable label only land in the rendered tile when
  // they're stamped onto the `TextBasedLayerColumn` itself — the
  // top-level `LensMetricConfig.format` / `LensMetricConfig.label`
  // fields are wired through `mapToFormula` for the DSL path, but the
  // value-column path used by ES|QL had no equivalent until now. Push
  // them onto the headline column so an ES|QL KPI renders with the
  // same chrome (e.g. "CPU Usage" / `43%`) as the DSL/formula variant
  // instead of the bare ES|QL column name (`value`) and an unformatted
  // float (`0.433`).
  const headlineFormat = mapToValueFormat(layer);
  return [
    ...(layer.breakdown
      ? [getValueColumn(getAccessorName('breakdown'), layer.breakdown as string)]
      : []),
    getValueColumn(ACCESSOR, layer.value, 'number', headlineFormat, layer.label),
    ...(layer.queryMaxValue
      ? [getValueColumn(getAccessorName('max'), layer.queryMaxValue, 'number')]
      : []),
    ...(layer.querySecondaryMetric
      ? [getValueColumn(getAccessorName('secondary'), layer.querySecondaryMetric)]
      : []),
  ];
}

export async function buildMetric(
  config: LensMetricConfig,
  { dataViewsAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensMetricConfig, i, dataView);
  const datasourceStates = await buildDatasourceStates(
    config,
    dataviews,
    _buildFormulaLayer,
    getValueColumns,
    dataViewsAPI
  );
  const { references, internalReferences, adHocDataViews } = extractReferences(dataviews);

  return {
    title: config.title,
    visualizationType: 'lnsMetric',
    references,
    state: {
      datasourceStates,
      internalReferences,
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: buildVisualizationState(config),
      adHocDataViews,
    },
  };
}
