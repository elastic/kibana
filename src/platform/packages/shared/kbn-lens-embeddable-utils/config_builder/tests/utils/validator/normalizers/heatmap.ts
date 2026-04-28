/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HeatmapVisualizationState } from '@kbn/lens-common';

import type { LensAttributes } from '../../../../types';
import type { NormalizerConfig } from './normalize';
import { mergeNormalizers } from './normalize';
import type { ColumnRemapping } from './common';
import { DEFAULT_LAYER_ID, getCommonNormalizer, getPaletteNormalizer } from './common';

type HeatmapAttributes = Extract<LensAttributes, { visualizationType: 'lnsHeatmap' }>;

const alignLegacyTypes: NormalizerConfig<HeatmapAttributes> = {
  original: (attributes) => {
    // state.state.visualization.palette = normalizePaletteState(state.state.visualization.palette);

    const {
      legend: { isVisible, shouldTruncate },
      gridConfig: { isXAxisTitleVisible, isYAxisTitleVisible },
    } = attributes.state.visualization;

    // Set defaults added by the transform that the original doesn't have
    // https://github.com/elastic/kibana/issues/246078
    attributes.state.visualization.legend.isVisible = isVisible ?? false;
    attributes.state.visualization.legend.shouldTruncate = shouldTruncate ?? false;
    if (!shouldTruncate) delete attributes.state.visualization.legend.maxLines; // not needed if false
    attributes.state.visualization.gridConfig.isXAxisTitleVisible = isXAxisTitleVisible ?? false;
    attributes.state.visualization.gridConfig.isYAxisTitleVisible = isYAxisTitleVisible ?? false;

    // Align deprecated naming conventions
    attributes.state.visualization.gridConfig.type = 'heatmap_grid';
    attributes.state.visualization.legend.type = 'heatmap_legend';

    return attributes;
  },
  transformed: (attributes) => {
    // Align deprecated naming conventions
    attributes.state.visualization.gridConfig.type = 'heatmap_grid';
    attributes.state.visualization.legend.type = 'heatmap_legend';

    // Remove transform-added column properties not in the original
    for (const dsState of Object.values(attributes.state.datasourceStates)) {
      for (const layer of Object.values(dsState.layers)) {
        layer.columnOrder = [...layer.columnOrder].sort();
        for (const col of Object.values(layer.columns)) {
          delete (col as any).params?.parentFormat;
          if ((col as any).operationType === 'count') {
            delete (col as any).params;
          }
        }
      }
    }

    return attributes;
  },
};

function getColumnRemapping({
  xAccessor,
  yAccessor,
  valueAccessor,
}: HeatmapVisualizationState): ColumnRemapping {
  return [
    [xAccessor, 'heatmap_value_accessor_x'],
    [yAccessor, 'heatmap_value_accessor_y'],
    [valueAccessor, 'heatmap_value_accessor_value'],
  ];
}

const alignId: NormalizerConfig<HeatmapAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;
    const columnRemapping = getColumnRemapping(viz);
    const idMap = Object.fromEntries(
      columnRemapping.filter((pair): pair is [string, string] => pair[0] != null)
    );

    viz.layerId = DEFAULT_LAYER_ID;

    if (viz.xAccessor) viz.xAccessor = 'heatmap_value_accessor_x';
    if (viz.yAccessor) viz.yAccessor = 'heatmap_value_accessor_y';
    if (viz.valueAccessor) viz.valueAccessor = 'heatmap_value_accessor_value';
    if (viz.palette?.accessor) viz.palette.accessor = idMap[viz.palette.accessor];

    return attributes;
  },
};

const missingProperties: NormalizerConfig<HeatmapAttributes> = {
  ignore: [
    'state.datasourceStates.formBased.layers.*.indexPatternId',
    'state.datasourceStates.formBased.currentIndexPatternId',
  ],
};

const conflictingProperties: NormalizerConfig<HeatmapAttributes> = {
  original: (attributes) => {
    const layers = attributes.state.datasourceStates.formBased?.layers ?? {};

    for (const layer of Object.values(layers)) {
      for (const col of Object.values(layer.columns)) {
        if (col.dataType === 'ip') {
          col.dataType = 'string'; // ip is set to string in transforms
        }
        // if (col.dataType === 'string') {
        //   col.dataType = 'number'; // string is set to number in transforms
        // }
      }
    }

    return attributes;
  },
  ignore: [
    'state.datasourceStates.formBased.layers.*.columns.*.label',
    'state.datasourceStates.formBased.layers.*.columns.*.customLabel',
    'state.datasourceStates.formBased.layers.*.columns.*.params', // these are wildly different
    // 'state.visualization.legend.shouldTruncate',
  ],
};

export const normalizeHeatmap = mergeNormalizers([
  getCommonNormalizer<HeatmapAttributes>(({ state: { visualization } }) => ({
    layerId: visualization.layerId,
    columnRemapping: getColumnRemapping(visualization),
  })),
  alignLegacyTypes,
  getPaletteNormalizer<HeatmapAttributes>('state.visualization.palette'),
  alignId,
  missingProperties,
  conflictingProperties,
]);
