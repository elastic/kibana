/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { $Values } from '@kbn/utility-types';
import { colorSchemas } from 'ui/color_maps';

export const Positions = Object.freeze({
  RIGHT: 'right' as 'right',
  LEFT: 'left' as 'left',
  TOP: 'top' as 'top',
  BOTTOM: 'bottom' as 'bottom',
});
export type Positions = $Values<typeof Positions>;

const getPositions = () => [
  {
    text: i18n.translate('kbnVislibVisTypes.legendPositions.topText', {
      defaultMessage: 'Top',
    }),
    value: Positions.TOP,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.legendPositions.leftText', {
      defaultMessage: 'Left',
    }),
    value: Positions.LEFT,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.legendPositions.rightText', {
      defaultMessage: 'Right',
    }),
    value: Positions.RIGHT,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.legendPositions.bottomText', {
      defaultMessage: 'Bottom',
    }),
    value: Positions.BOTTOM,
  },
];

export const ChartTypes = Object.freeze({
  LINE: 'line' as 'line',
  AREA: 'area' as 'area',
  HISTOGRAM: 'histogram' as 'histogram',
});
export type ChartTypes = $Values<typeof ChartTypes>;

const getChartTypes = () => [
  {
    text: i18n.translate('kbnVislibVisTypes.chartTypes.lineText', {
      defaultMessage: 'Line',
    }),
    value: ChartTypes.LINE,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.chartTypes.areaText', {
      defaultMessage: 'Area',
    }),
    value: ChartTypes.AREA,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.chartTypes.barText', {
      defaultMessage: 'Bar',
    }),
    value: ChartTypes.HISTOGRAM,
  },
];

export const ChartModes = Object.freeze({
  NORMAL: 'normal' as 'normal',
  STACKED: 'stacked' as 'stacked',
});
export type ChartModes = $Values<typeof ChartModes>;

const getChartModes = () => [
  {
    text: i18n.translate('kbnVislibVisTypes.chartModes.normalText', {
      defaultMessage: 'Normal',
    }),
    value: ChartModes.NORMAL,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.chartModes.stackedText', {
      defaultMessage: 'Stacked',
    }),
    value: ChartModes.STACKED,
  },
];

export const InterpolationModes = Object.freeze({
  LINEAR: 'linear' as 'linear',
  CARDINAL: 'cardinal' as 'cardinal',
  STEP_AFTER: 'step-after' as 'step-after',
});
export type InterpolationModes = $Values<typeof InterpolationModes>;

const getInterpolationModes = () => [
  {
    text: i18n.translate('kbnVislibVisTypes.interpolationModes.straightText', {
      defaultMessage: 'Straight',
    }),
    value: InterpolationModes.LINEAR,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.interpolationModes.smoothedText', {
      defaultMessage: 'Smoothed',
    }),
    value: InterpolationModes.CARDINAL,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.interpolationModes.steppedText', {
      defaultMessage: 'Stepped',
    }),
    value: InterpolationModes.STEP_AFTER,
  },
];

export const AxisTypes = Object.freeze({
  CATEGORY: 'category' as 'category',
  VALUE: 'value' as 'value',
});
export type AxisTypes = $Values<typeof AxisTypes>;

export const ScaleTypes = Object.freeze({
  LINEAR: 'linear' as 'linear',
  LOG: 'log' as 'log',
  SQUARE_ROOT: 'square root' as 'square root',
});
export type ScaleTypes = $Values<typeof ScaleTypes>;

const getScaleTypes = () => [
  {
    text: i18n.translate('kbnVislibVisTypes.scaleTypes.linearText', {
      defaultMessage: 'Linear',
    }),
    value: ScaleTypes.LINEAR,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.scaleTypes.logText', {
      defaultMessage: 'Log',
    }),
    value: ScaleTypes.LOG,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.scaleTypes.squareRootText', {
      defaultMessage: 'Square root',
    }),
    value: ScaleTypes.SQUARE_ROOT,
  },
];

export const AxisModes = Object.freeze({
  NORMAL: 'normal' as 'normal',
  PERCENTAGE: 'percentage' as 'percentage',
  WIGGLE: 'wiggle' as 'wiggle',
  SILHOUETTE: 'silhouette' as 'silhouette',
});
export type AxisModes = $Values<typeof AxisModes>;

const getAxisModes = () => [
  {
    text: i18n.translate('kbnVislibVisTypes.axisModes.normalText', {
      defaultMessage: 'Normal',
    }),
    value: AxisModes.NORMAL,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.axisModes.percentageText', {
      defaultMessage: 'Percentage',
    }),
    value: AxisModes.PERCENTAGE,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.axisModes.wiggleText', {
      defaultMessage: 'Wiggle',
    }),
    value: AxisModes.WIGGLE,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.axisModes.silhouetteText', {
      defaultMessage: 'Silhouette',
    }),
    value: AxisModes.SILHOUETTE,
  },
];

export const Rotates = Object.freeze({
  HORIZONTAL: 0,
  VERTICAL: 90,
  ANGLED: 75,
});
export type Rotates = $Values<typeof Rotates>;

export const ThresholdLineStyles = Object.freeze({
  FULL: 'full' as 'full',
  DASHED: 'dashed' as 'dashed',
  DOT_DASHED: 'dot-dashed' as 'dot-dashed',
});
export type ThresholdLineStyles = $Values<typeof ThresholdLineStyles>;

const getThresholdLineStyles = () => [
  {
    value: ThresholdLineStyles.FULL,
    text: i18n.translate('kbnVislibVisTypes.thresholdLine.style.fullText', {
      defaultMessage: 'Full',
    }),
  },
  {
    value: ThresholdLineStyles.DASHED,
    text: i18n.translate('kbnVislibVisTypes.thresholdLine.style.dashedText', {
      defaultMessage: 'Dashed',
    }),
  },
  {
    value: ThresholdLineStyles.DOT_DASHED,
    text: i18n.translate('kbnVislibVisTypes.thresholdLine.style.dotdashedText', {
      defaultMessage: 'Dot-dashed',
    }),
  },
];

const getRotateOptions = () => [
  {
    text: i18n.translate('kbnVislibVisTypes.categoryAxis.rotate.horizontalText', {
      defaultMessage: 'Horizontal',
    }),
    value: Rotates.HORIZONTAL,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.categoryAxis.rotate.verticalText', {
      defaultMessage: 'Vertical',
    }),
    value: Rotates.VERTICAL,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.categoryAxis.rotate.angledText', {
      defaultMessage: 'Angled',
    }),
    value: Rotates.ANGLED,
  },
];

export const GaugeTypes = Object.freeze({
  ARC: 'Arc' as 'Arc',
  CIRCLE: 'Circle' as 'Circle',
});
export type GaugeTypes = $Values<typeof GaugeTypes>;

export const ColorModes = Object.freeze({
  BACKGROUND: 'Background' as 'Background',
  LABELS: 'Labels' as 'Labels',
  NONE: 'None' as 'None',
});
export type ColorModes = $Values<typeof ColorModes>;

const getGaugeTypes = () => [
  {
    text: i18n.translate('kbnVislibVisTypes.gauge.gaugeTypes.arcText', {
      defaultMessage: 'Arc',
    }),
    value: GaugeTypes.ARC,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.gauge.gaugeTypes.circleText', {
      defaultMessage: 'Circle',
    }),
    value: GaugeTypes.CIRCLE,
  },
];

export const Alignments = Object.freeze({
  AUTOMATIC: 'automatic' as 'automatic',
  HORIZONTAL: 'horizontal' as 'horizontal',
  VERTICAL: 'vertical' as 'vertical',
});
export type Alignments = $Values<typeof Alignments>;

const getAlignments = () => [
  {
    text: i18n.translate('kbnVislibVisTypes.gauge.alignmentAutomaticTitle', {
      defaultMessage: 'Automatic',
    }),
    value: Alignments.AUTOMATIC,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.gauge.alignmentHorizontalTitle', {
      defaultMessage: 'Horizontal',
    }),
    value: Alignments.HORIZONTAL,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.gauge.alignmentVerticalTitle', {
      defaultMessage: 'Vertical',
    }),
    value: Alignments.VERTICAL,
  },
];

const getConfigCollections = () => ({
  legendPositions: getPositions(),
  positions: getPositions(),
  chartTypes: getChartTypes(),
  axisModes: getAxisModes(),
  scaleTypes: getScaleTypes(),
  chartModes: getChartModes(),
  interpolationModes: getInterpolationModes(),
  thresholdLineStyles: getThresholdLineStyles(),
});

const getGaugeCollections = () => ({
  gaugeTypes: getGaugeTypes(),
  alignments: getAlignments(),
  colorSchemas,
});

const getHeatmapCollections = () => ({
  legendPositions: getPositions(),
  scales: getScaleTypes(),
  colorSchemas,
});

export {
  getConfigCollections,
  getGaugeCollections,
  getHeatmapCollections,
  getPositions,
  getRotateOptions,
  getScaleTypes,
  getInterpolationModes,
  getChartTypes,
  getChartModes,
  getAxisModes,
};
