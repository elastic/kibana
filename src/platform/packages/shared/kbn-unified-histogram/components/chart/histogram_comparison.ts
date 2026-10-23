/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { enrichLensAttributesWithTablesData } from '../../utils/lens_vis_from_table';
import {
  HISTOGRAM_OVERLAY_COLUMN,
  HISTOGRAM_REMAINDER_COLUMN,
  HISTOGRAM_TOTAL_COLUMN,
} from './split_histogram_table';

interface HistogramVisualizationLayer {
  layerId?: string;
  seriesType?: string;
  accessors?: string[];
  yConfig?: Array<{ forAccessor: string; color?: string }>;
}

const getHistogramComparisonLayers = (attributes: LensAttributes) => {
  const textBased = attributes.state.datasourceStates.textBased;
  const visualization = attributes.state.visualization as {
    layers?: HistogramVisualizationLayer[];
  };
  const chartLayers = visualization.layers;
  const layerId = chartLayers?.[0]?.layerId;
  const layer = layerId ? textBased?.layers[layerId] : undefined;
  const totalColumn = layer?.columns.find((column) => column.columnId === HISTOGRAM_TOTAL_COLUMN);
  if (
    !textBased ||
    !layerId ||
    !layer ||
    !totalColumn ||
    Object.keys(textBased.layers).length !== 1 ||
    chartLayers?.length !== 1 ||
    chartLayers[0].seriesType !== 'bar_stacked' ||
    chartLayers[0].accessors?.length !== 1 ||
    chartLayers[0].accessors[0] !== HISTOGRAM_TOTAL_COLUMN
  ) {
    return undefined;
  }
  return { textBased, layerId, layer, chartLayer: chartLayers[0], totalColumn, visualization };
};

export const canApplyHistogramComparison = (attributes: LensAttributes): boolean =>
  getHistogramComparisonLayers(attributes) !== undefined;

/** Draws the split table as two stacked series in place of the single total series. */
export const applyHistogramComparisonAttributes = ({
  attributes,
  table,
  colors,
}: {
  attributes: LensAttributes;
  table: Datatable;
  colors: { overlay: string; remainder: string };
}): LensAttributes | undefined => {
  const layers = getHistogramComparisonLayers(attributes);
  if (!layers) {
    return undefined;
  }
  const { textBased, layerId, layer, chartLayer, totalColumn, visualization } = layers;
  const seriesColumn = (columnId: string) => ({
    ...totalColumn,
    columnId,
    fieldName: columnId,
    label: table.columns.find((column) => column.id === columnId)?.name,
    customLabel: true,
    inMetricDimension: true,
  });

  const derived: LensAttributes = {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: {
          ...textBased,
          layers: {
            [layerId]: {
              ...layer,
              columns: [
                ...layer.columns,
                seriesColumn(HISTOGRAM_OVERLAY_COLUMN),
                seriesColumn(HISTOGRAM_REMAINDER_COLUMN),
              ],
            },
          },
        },
      },
      visualization: {
        ...visualization,
        layers: [
          {
            ...chartLayer,
            accessors: [HISTOGRAM_OVERLAY_COLUMN, HISTOGRAM_REMAINDER_COLUMN],
            yConfig: [
              { forAccessor: HISTOGRAM_OVERLAY_COLUMN, color: colors.overlay },
              { forAccessor: HISTOGRAM_REMAINDER_COLUMN, color: colors.remainder },
            ],
          },
        ],
      },
    },
  };

  return enrichLensAttributesWithTablesData({ attributes: derived, table });
};
