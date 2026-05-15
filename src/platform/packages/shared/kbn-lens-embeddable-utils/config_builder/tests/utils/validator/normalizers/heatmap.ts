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
import type { IdRemapping } from './common';
import { DEFAULT_LAYER_ID, getCommonNormalizer, getPaletteNormalizer } from './common';

type HeatmapAttributes = Extract<LensAttributes, { visualizationType: 'lnsHeatmap' }>;

const alignLegacyTypes: NormalizerConfig<HeatmapAttributes> = {
  original: (attributes) => {
    const {
      legend: { isVisible, shouldTruncate },
      gridConfig: { isXAxisTitleVisible, isYAxisTitleVisible },
    } = attributes.state.visualization;
    const hasYAxis = Boolean(attributes.state.visualization.yAccessor);

    // Set defaults added by the transform that the original doesn't have
    // https://github.com/elastic/kibana/issues/246078
    attributes.state.visualization.legend.isVisible = isVisible ?? false;
    attributes.state.visualization.legend.shouldTruncate = shouldTruncate ?? false;
    if (!shouldTruncate) delete attributes.state.visualization.legend.maxLines; // not needed if false
    attributes.state.visualization.gridConfig.isXAxisTitleVisible = isXAxisTitleVisible ?? false;
    // from_api uses layer.axis?.y?.title?.visible ?? false; when there is no Y bucket there is no axis.y
    attributes.state.visualization.gridConfig.isYAxisTitleVisible = hasYAxis
      ? isYAxisTitleVisible ?? false
      : false;

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
    for (const layer of Object.values(attributes.state.datasourceStates.formBased?.layers ?? {})) {
      layer.columnOrder = [...layer.columnOrder].sort();
      for (const col of Object.values(layer.columns)) {
        delete (col as any).params?.parentFormat;
        if (col.operationType === 'count') {
          delete (col as any).params;
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
}: HeatmapVisualizationState): IdRemapping {
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

export const normalizeHeatmap = mergeNormalizers([
  getCommonNormalizer<HeatmapAttributes>(({ state: { visualization } }) => ({
    layerRemapping: [[visualization.layerId, DEFAULT_LAYER_ID]],
    columnRemapping: getColumnRemapping(visualization),
  })),
  alignId,
  alignLegacyTypes,
  getPaletteNormalizer<HeatmapAttributes>('state.visualization.palette'),
]);
