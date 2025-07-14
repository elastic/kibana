/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Position } from '@elastic/charts';
import type { ColorMapping, PaletteOutput } from '@kbn/coloring';
import type {
  CategoryDisplayType,
  CollapseFunction,
  LensLayerType,
  LegendDisplayType,
  NumberDisplayType,
} from '../lens_types';
import type { PartitionChartType, PartitionLegendValue } from './expression_types';
import { LegendSize } from '../expression_types';

export interface SharedPartitionLayerState {
  metrics: string[];
  primaryGroups: string[];
  secondaryGroups?: string[];
  allowMultipleMetrics?: boolean;
  colorsByDimension?: Record<string, string>;
  collapseFns?: Record<string, CollapseFunction>;
  numberDisplay: NumberDisplayType;
  categoryDisplay: CategoryDisplayType;
  legendDisplay: LegendDisplayType;
  legendPosition?: Position;
  legendStats?: PartitionLegendValue[];
  nestedLegend?: boolean;
  percentDecimals?: number;
  emptySizeRatio?: number;
  legendMaxLines?: number;
  legendSize?: LegendSize;
  truncateLegend?: boolean;
  colorMapping?: ColorMapping.Config;
}

export type LensPartitionLayerState = SharedPartitionLayerState & {
  layerId: string;
  layerType: LensLayerType;
};

export interface LensPartitionVisualizationState {
  shape: PartitionChartType;
  layers: LensPartitionLayerState[];
  /**
   * @deprecated use `layer.colorMapping` config
   */
  palette?: PaletteOutput;
}
