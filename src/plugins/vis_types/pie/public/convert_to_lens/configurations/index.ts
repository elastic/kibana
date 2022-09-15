/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PartitionVisParams } from '@kbn/expression-partition-vis-plugin/common';
import { Column, PartitionVisConfiguration } from '@kbn/visualizations-plugin/common';
import { Vis } from '@kbn/visualizations-plugin/public';

const getLayers = (
  layerId: string,
  vis: Vis<PartitionVisParams>,
  columnsWithoutReferenced: Column[],
  buckets: string[]
) => {
  return [
    {
      layerId,
      layerType: 'data' as const,
      primaryGroups: buckets,
      secondaryGroups: [],
      metric: columnsWithoutReferenced[0].columnId,
      numberDisplay: vis.params.labels.valuesFormat ?? vis.type.visConfig.labels.valuesFormat,
      categoryDisplay: vis.params.labels.position ?? vis.type.visConfig.labels.position,
      legendDisplay: vis.params.legendDisplay ?? vis.type.visConfig.legendDisplay,
      legendPosition: vis.params.legendPosition ?? vis.type.visConfig.legendPosition,
      showValuesInLegend: vis.params.showValuesInLegend ?? vis.type.visConfig.showValuesInLegend,
      nestedLegend: vis.params.nestedLegend ?? vis.type.visConfig.nestedLegend,
      percentDecimals:
        vis.params.labels.percentDecimals ?? vis.type.visConfig.labels.percentDecimals,
      emptySizeRatio: vis.params.emptySizeRatio ?? vis.type.visConfig.emptySizeRatio,
      legendMaxLines: vis.params.maxLegendLines ?? vis.type.visConfig.maxLegendLines,
      legendSize: vis.params.legendSize ?? vis.type.visConfig.legendSize,
      truncateLegend: vis.params.truncateLegend ?? vis.type.visConfig.truncateLegend,
    },
  ];
};

export const getConfiguration = (
  layerId: string,
  vis: Vis<PartitionVisParams>,
  {
    metrics,
    buckets,
    columnsWithoutReferenced,
  }: {
    metrics: string[];
    buckets: string[];
    columnsWithoutReferenced: Column[];
  }
): PartitionVisConfiguration => {
  return {
    shape: vis.params.isDonut ? 'donut' : 'pie',
    layers: getLayers(layerId, vis, columnsWithoutReferenced, buckets),
    palette: vis.params.palette,
  };
};
