/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { RestorableStateProviderProps } from '@kbn/restorable-state';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { TimeRange } from '@kbn/es-query';
import type { ForkBranchSourceQuery } from '@kbn/esql-utils';
import type { ChartSectionConfigurationExtensionParams } from '../../../types';

export type TimeInterval = 'month' | 'day' | 'hour' | 'minute';

/** Bucket for burst histogram: x = timestamp (ms), g = entity label, y = 1 per entity in bucket (stacked). */
export interface BurstDetectionHistogramBucket {
  x: number;
  g: string;
  y: number;
}

export interface ChangePointBurstHistogramProps {
  data: BurstDetectionHistogramBucket[];
  charts: ChartsPluginStart;
}

/** Props for the change point experience view; matches ChartSectionConfiguration's renderChartSection (default T = object). */
export type ChangePointExperienceViewProps = ChartSectionProps &
  RestorableStateProviderProps<object> & {
    actions?: ChartSectionConfigurationExtensionParams['actions'];
  };

export interface ChangePointForkHeatmapProps {
  results: ChangePointResult[];
  forkBranches: ForkBranchSourceQuery[];
  selectedEntityIndices: number[];
  onSelectEntity: (indices: number[]) => void;
  renderEntityDetailChart: (entityIndex: number) => React.ReactNode;
  /** When provided, columns span the full date range at the best interval derived from results. */
  timeRange?: TimeRange;
  charts: ChartsPluginStart;
}

/** A single change point result from the ES|QL CHANGE_POINT output. */
export interface ChangePointResult {
  timestamp: string;
  type?: string;
  pvalue?: number | null;
  value?: number;
  /** Branch index when CHANGE_POINT is inside FORK (_fork column value). */
  forkIndex?: number;
}

export interface DataLayerLike {
  layerType?: string;
  accessors?: string[];
  yConfig?: Array<{ forAccessor: string; color?: string }>;
  [key: string]: unknown;
}

/** Record-like row with id and optional flattened fields (e.g. from DataTableRecord). */
export interface RecordLike {
  id: string;
  flattened?: Record<string, unknown>;
}
