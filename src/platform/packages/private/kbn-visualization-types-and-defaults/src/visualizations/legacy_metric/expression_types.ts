/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { PaletteOutput } from '@kbn/coloring';
import { Style } from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { ColorMode, CustomPaletteState, Style as ChartStyle } from '@kbn/charts-plugin/common';
import { $Values } from '@kbn/utility-types';
import { LEGACY_METRIC_LABEL_POSITION } from './constants';

export type LegacyMetricLabelPositionType = $Values<typeof LEGACY_METRIC_LABEL_POSITION>;

export type LegacyMetricStyle = Style & Pick<ChartStyle, 'bgColor' | 'labelColor'>;

export type LegacyMetricLabelsConfig = Labels & {
  style: Style;
  position: LegacyMetricLabelPositionType;
};

export type LegacyMetricAlignment = 'left' | 'center' | 'right';

export interface LegacyMetricArguments {
  autoScaleMetricAlignment?: LegacyMetricAlignment;
  percentageMode: boolean;
  colorMode: ColorMode;
  showLabels: boolean;
  palette?: PaletteOutput<CustomPaletteState>;
  font: Style;
  labelFont: Style;
  labelPosition: LegacyMetricLabelPositionType;
  metric: Array<ExpressionValueVisDimension | string>;
  bucket?: ExpressionValueVisDimension | string;
  colorFullBackground: boolean;
  autoScale?: boolean;
}
