/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LayoutDirection, MetricStyle, SecondaryMetricProps } from '@elastic/charts';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { KbnPaletteId } from '@kbn/palettes';
import type { OptionalKeys } from 'utility-types';
import type { CollapseFunction, LensLayerType } from '../types';

export type ValueFontMode = Exclude<MetricStyle['valueFontSize'], number>;
export type PrimaryMetricFontSize = ValueFontMode;

export type PrimaryMetricPosition = MetricStyle['valuePosition'];
export type MetricDensity = 'compact' | 'default';
export type MetricStyleTemplateId = 'top' | 'middle' | 'bottom' | 'custom';
export type MetricStyleTemplatePresetId = Exclude<MetricStyleTemplateId, 'custom'>;

export type SecondaryTrendType = 'none' | 'static' | 'dynamic';

/**
 * Visibility and placement of the secondary metric name.
 * `hidden` has no equivalent in `@elastic/charts`, where it is expressed as an empty label.
 */
export type SecondaryNameVisibility = 'hidden' | NonNullable<SecondaryMetricProps['labelPosition']>;

export type SecondaryTrend =
  | { type: 'none' }
  | { type: 'static'; color: string }
  | {
      type: 'dynamic';
      visuals: 'icon' | 'value' | 'both';
      paletteId: KbnPaletteId;
      reversed: boolean;
      baselineValue: number | 'primary';
    };

export interface MetricVisualizationState {
  layerId: string;
  layerType: LensLayerType;
  metricAccessor?: string;
  secondaryMetricAccessor?: string;
  maxAccessor?: string;
  breakdownByAccessor?: string;
  // the dimensions can optionally be single numbers
  // computed by collapsing all rows
  collapseFn?: CollapseFunction;
  subtitle?: string;
  /**
   * legacy state property
   * @deprecated
   */
  secondaryPrefix?: string;
  /**
   * Legacy state property. Non-empty values are migrated onto the secondary metric
   * column as a custom label; visibility becomes `secondaryNameVisibility`.
   * @deprecated
   */
  secondaryLabel?: string;
  secondaryTrend?: SecondaryTrend;
  progressDirection?: LayoutDirection;
  showBar?: boolean;
  titlesTextAlign?: MetricStyle['titlesTextAlign'];
  /**
   * legacy state property
   * @deprecated
   */
  valuesTextAlign?: MetricStyle['valueTextAlign'];
  secondaryAlign?: MetricStyle['extraTextAlign'];
  primaryAlign?: MetricStyle['valueTextAlign'];
  iconAlign?: MetricStyle['iconAlign'];
  valueFontMode?: ValueFontMode;
  density?: MetricDensity;
  /**
   * legacy state property
   * @deprecated
   */
  titleWeight?: Extract<MetricStyle['titleWeight'], string>;
  primaryPosition?: PrimaryMetricPosition;
  secondaryNameVisibility?: SecondaryNameVisibility;
  color?: string;
  icon?: string;
  palette?: PaletteOutput<CustomPaletteParams>;
  maxCols?: number;

  trendlineLayerId?: string;
  trendlineLayerType?: LensLayerType;
  trendlineTimeAccessor?: string;
  trendlineMetricAccessor?: string;
  trendlineSecondaryMetricAccessor?: string;
  trendlineBreakdownByAccessor?: string;

  applyColorTo?: 'background' | 'value'; // Used for coordination between dimension editor sections
}

export type MetricVisualizationStateOptionals = Pick<
  MetricVisualizationState,
  OptionalKeys<MetricVisualizationState>
>;

export type MetricStateOptinalsWithDefault = Pick<
  MetricVisualizationStateOptionals,
  | 'titlesTextAlign'
  | 'primaryAlign'
  | 'secondaryAlign'
  | 'iconAlign'
  | 'valueFontMode'
  | 'density'
  | 'primaryPosition'
  | 'secondaryNameVisibility'
  | 'applyColorTo'
>;

export type MetricStateDefaults = Required<MetricStateOptinalsWithDefault>;

export type MetricLayoutWithDefault = Required<
  Pick<MetricStateOptinalsWithDefault, 'titlesTextAlign' | 'primaryAlign' | 'primaryPosition'>
> & {
  secondaryAlign?: MetricStateOptinalsWithDefault['secondaryAlign'];
};

export type IconPosition = MetricStyle['iconAlign'];

export type Alignment = 'left' | 'center' | 'right';
