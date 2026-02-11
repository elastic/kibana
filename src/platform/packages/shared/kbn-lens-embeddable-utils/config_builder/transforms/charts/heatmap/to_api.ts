/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  HEATMAP_NAME,
  type FormBasedLayer,
  type HeatmapVisualizationState,
  type TextBasedLayer,
} from '@kbn/lens-common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Reference } from '@kbn/content-management-utils';
import { DEFAULT_LAYER_ID } from '../../../constants';
import { getDatasourceLayers, getSharedChartLensStateToAPI, stripUndefined } from '../utils';
import type { HeatmapState } from '../../../schema';
import { fromColorByValueLensStateToAPI } from '../../coloring';
import { type LensAttributes } from '../../../types';
import {
  buildDatasetStateESQL,
  buildDatasetStateNoESQL,
  generateApiLayer,
  isTextBasedLayer,
  operationFromColumn,
} from '../../utils';
import type { HeatmapStateESQL, HeatmapStateNoESQL } from '../../../schema/charts/heatmap';
import { getValueApiColumn } from '../../columns/esql_column';
import type { LensApiAllMetricOperations } from '../../../schema/metric_ops';

function getLegendProps(legend: HeatmapVisualizationState['legend']): HeatmapState['legend'] {
  return {
    visible: legend.isVisible,
    position: legend.position,
    ...stripUndefined<HeatmapState['legend']>({
      truncate_after_lines: legend.maxLines,
      size: legend.legendSize,
    }),
  };
}

function getOrientationFromRotation(rotation: number): 'angled' | 'vertical' | 'horizontal' {
  return rotation === -45 ? 'angled' : rotation === -90 ? 'vertical' : 'horizontal';
}

function getGridConfigProps(
  gridConfig: HeatmapVisualizationState['gridConfig']
): HeatmapState['axes'] {
  return {
    x: {
      labels: {
        visible: gridConfig.isXAxisLabelVisible,
        ...(gridConfig.xAxisLabelRotation !== undefined && {
          orientation: getOrientationFromRotation(gridConfig.xAxisLabelRotation),
        }),
      },
      title: {
        value: gridConfig.xTitle,
        visible: gridConfig.isXAxisTitleVisible,
      },
    },
    y: {
      labels: { visible: gridConfig.isYAxisLabelVisible },
      title: {
        value: gridConfig.yTitle,
        visible: gridConfig.isYAxisTitleVisible,
      },
    },
  };
}

function reverseBuildVisualizationState(
  visualization: HeatmapVisualizationState,
  layer: FormBasedLayer | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: Reference[],
  adhocReferences?: Reference[]
): HeatmapState {
  const valueAccessor = visualization.valueAccessor;
  if (valueAccessor == null) {
    throw new Error('Value accessor is missing in the visualization state');
  }

  const sharedProps = {
    ...generateApiLayer(layer),
    type: HEATMAP_NAME,
    legend: getLegendProps(visualization.legend),
    axes: getGridConfigProps(visualization.gridConfig),
    cells: {
      labels: { visible: visualization.gridConfig.isCellLabelVisible },
    },
  } satisfies Partial<HeatmapState>;

  const paletteProps = {
    ...(visualization.palette && {
      color: fromColorByValueLensStateToAPI(visualization.palette),
    }),
  } satisfies Partial<HeatmapState['metric']>;

  if (isTextBasedLayer(layer)) {
    if (!visualization.xAccessor) {
      throw new Error('xAccessor is missing in the visualization state');
    }

    const dataset = buildDatasetStateESQL(layer);

    return {
      ...sharedProps,
      dataset,
      metric: {
        ...getValueApiColumn(valueAccessor, layer),
        ...paletteProps,
      },
      xAxis: getValueApiColumn(visualization.xAccessor, layer),
      ...(visualization.yAccessor && { yAxis: getValueApiColumn(visualization.yAccessor, layer) }),
    } satisfies HeatmapStateESQL;
  }

  const dataset = buildDatasetStateNoESQL(
    layer,
    layerId,
    adHocDataViews,
    references,
    adhocReferences
  );

  return {
    ...sharedProps,
    dataset,
    metric: {
      ...operationFromColumn(valueAccessor, layer),
      ...paletteProps,
    } as LensApiAllMetricOperations,
    xAxis: operationFromColumn(visualization.xAccessor!, layer),
    yAxis: visualization.yAccessor && operationFromColumn(visualization.yAccessor, layer),
  } as HeatmapStateNoESQL;
}

export function fromLensStateToAPI(config: LensAttributes): HeatmapState {
  const { state } = config;
  const visualization = state.visualization as HeatmapVisualizationState;
  const layers = getDatasourceLayers(state);

  // Layers can be in any order, so make sure to get the main one
  const [layerId, layer] = Object.entries(layers).find(
    ([, l]) => !('linkToLayers' in l) || l.linkToLayers == null
  )!;

  return {
    ...getSharedChartLensStateToAPI(config),
    ...reverseBuildVisualizationState(
      visualization,
      layer as FormBasedLayer | TextBasedLayer,
      layerId ?? DEFAULT_LAYER_ID,
      config.state.adHocDataViews ?? {},
      config.references,
      config.state.internalReferences
    ),
  } satisfies HeatmapState;
}
