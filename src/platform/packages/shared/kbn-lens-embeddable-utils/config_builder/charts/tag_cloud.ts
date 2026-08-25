/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FormBasedPersistedState, LensTagCloudState } from '@kbn/lens-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { BuildDependencies, LensAttributes, LensTagCloudConfig } from '../types';
import { DEFAULT_LAYER_ID } from '../constants';
import { addLayerColumn, buildDatasourceStates, extractReferences, mapToFormula } from '../utils';
import { getBreakdownColumn, getFormulaColumn, getValueColumn } from '../columns';

const ACCESSOR = 'metric_formula_accessor';

function getAccessorName(type: 'breakdown') {
  return `${ACCESSOR}_${type}`;
}

function buildVisualizationState(config: LensTagCloudConfig): LensTagCloudState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    valueAccessor: ACCESSOR,
    maxFontSize: 72,
    minFontSize: 12,
    orientation: 'single',
    showLabel: true,
    ...(layer.breakdown
      ? {
          tagAccessor: getAccessorName('breakdown'),
        }
      : {}),
  };
}

function buildFormulaLayer(
  layer: LensTagCloudConfig,
  i: number,
  dataView: DataView
): FormBasedPersistedState['layers'][0] {
  const layers = {
    [DEFAULT_LAYER_ID]: {
      ...getFormulaColumn(ACCESSOR, mapToFormula(layer), dataView),
    },
  };

  const defaultLayer = layers[DEFAULT_LAYER_ID];

  if (layer.breakdown) {
    const columnName = getAccessorName('breakdown');
    const breakdownColumn = getBreakdownColumn({
      options: layer.breakdown,
      dataView,
    });
    addLayerColumn(defaultLayer, columnName, breakdownColumn, true);
  } else {
    throw new Error('breakdown must be defined on tagcloud!');
  }

  return defaultLayer;
}

function getValueColumns(layer: LensTagCloudConfig) {
  if (layer.breakdown && typeof layer.breakdown !== 'string') {
    throw new Error('breakdown must be a field name when not using index source');
  }

  return [
    getValueColumn(ACCESSOR, layer.value),
    getValueColumn(getAccessorName('breakdown'), layer.breakdown as string),
  ];
}

export async function buildTagCloud(
  config: LensTagCloudConfig,
  { dataViewsAPI }: BuildDependencies
): Promise<LensAttributes> {
  const dataviews: Record<string, DataView> = {};
  const _buildFormulaLayer = (cfg: unknown, i: number, dataView: DataView) =>
    buildFormulaLayer(cfg as LensTagCloudConfig, i, dataView);
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
    visualizationType: 'lnsTagcloud',
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
