/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { $Values } from '@kbn/utility-types';
import {
  PARTITION_EMPTY_SIZE_RADIUS,
  PARTITION_LABEL_POSITIONS,
  PARTITION_VALUE_FORMATS,
  PARTITION_CHART_TYPES,
} from './constants';

export type PartitionChartType = $Values<typeof PARTITION_CHART_TYPES>;
export type EmptySizeRadius = $Values<typeof PARTITION_EMPTY_SIZE_RADIUS>;
export type LabelPositions = $Values<typeof PARTITION_LABEL_POSITIONS>;
export type ValueFormats = $Values<typeof PARTITION_VALUE_FORMATS>;

export type PartitionLegendValue = ValueFormats;

export interface PartitionLabelsArguments {
  show: boolean;
  position: LabelPositions;
  values: boolean;
  valuesFormat: ValueFormats;
  percentDecimals: number;
  colorOverrides?: string;
  /** @deprecated This field is deprecated and going to be removed in the futher release versions. */
  truncate?: number | null;
  /** @deprecated This field is deprecated and going to be removed in the futher release versions. */
  last_level?: boolean;
}
