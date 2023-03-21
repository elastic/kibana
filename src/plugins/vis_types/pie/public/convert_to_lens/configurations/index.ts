/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LegendDisplay, PartitionVisParams } from '@kbn/expression-partition-vis-plugin/common';
import {
  CategoryDisplayTypes,
  NumberDisplayTypes,
  PartitionVisConfiguration,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import { Vis } from '@kbn/visualizations-plugin/public';

const getLayers = (
  layerId: string,
  vis: Vis<PartitionVisParams>,
  metrics: string[],
  buckets: string[]
): PartitionVisConfiguration['layers'] => {
  const legendOpen = vis.uiState.get('vis.legendOpen');
  const legendDisplayFromUiState =
    legendOpen !== undefined ? (legendOpen ? LegendDisplay.SHOW : LegendDisplay.HIDE) : undefined;

  const showValuesInLegend =
    vis.params.labels.values ??
    vis.params.showValuesInLegend ??
    vis.type.visConfig.defaults.showValuesInLegend;

  return [
    {
      layerId,
      layerType: 'data' as const,
      primaryGroups: buckets,
      secondaryGroups: [],
      metrics: metrics.length ? [metrics[0]] : [],
      numberDisplay:
        showValuesInLegend === false
          ? NumberDisplayTypes.HIDDEN
          : vis.params.labels.valuesFormat ?? vis.type.visConfig.defaults.labels.valuesFormat,
      categoryDisplay: vis.params.labels.show
        ? vis.params.labels.position ?? vis.type.visConfig.defaults.labels.position
        : CategoryDisplayTypes.HIDE,
      legendDisplay:
        legendDisplayFromUiState ??
        vis.params.legendDisplay ??
        vis.type.visConfig.defaults.legendDisplay,
      legendPosition: vis.params.legendPosition ?? vis.type.visConfig.defaults.legendPosition,
      showValuesInLegend,
      nestedLegend: vis.params.nestedLegend ?? vis.type.visConfig.defaults.nestedLegend,
      percentDecimals:
        vis.params.labels.percentDecimals ?? vis.type.visConfig.defaults.labels.percentDecimals,
      emptySizeRatio: vis.params.emptySizeRatio ?? vis.type.visConfig.defaults.emptySizeRatio,
      legendMaxLines: vis.params.maxLegendLines ?? vis.type.visConfig.defaults.maxLegendLines,
      legendSize: vis.params.legendSize ?? vis.type.visConfig.defaults.legendSize,
      truncateLegend: vis.params.truncateLegend ?? vis.type.visConfig.defaults.truncateLegend,
    },
  ];
};

export const getConfiguration = (
  layerId: string,
  vis: Vis<PartitionVisParams>,
  {
    metrics,
    buckets,
  }: {
    metrics: string[];
    buckets: {
      all: string[];
      customBuckets: Record<string, string>;
    };
  }
): PartitionVisConfiguration => {
  return {
    shape: vis.params.isDonut ? 'donut' : 'pie',
    layers: getLayers(layerId, vis, metrics, buckets.all),
    palette: vis.params.palette,
  };
};
