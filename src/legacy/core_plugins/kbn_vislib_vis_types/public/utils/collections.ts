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
import { colorSchemas } from 'ui/color_maps';

export enum Positions {
  RIGHT = 'right',
  LEFT = 'left',
  TOP = 'top',
  BOTTOM = 'bottom',
}

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

export enum ChartTypes {
  LINE = 'line',
  AREA = 'area',
  HISTOGRAM = 'histogram',
}

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

export enum ChartModes {
  NORMAL = 'normal',
  STACKED = 'stacked',
}

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

export enum InterpolationModes {
  LINEAR = 'linear',
  CARDINAL = 'cardinal',
  STEP_AFTER = 'step-after',
}

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

export enum AxisTypes {
  CATEGORY = 'category',
  VALUE = 'value',
}

export enum ScaleTypes {
  LINEAR = 'linear',
  LOG = 'log',
  SQUARE_ROOT = 'square root',
}

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

export enum AxisModes {
  NORMAL = 'normal',
  PERCENTAGE = 'percentage',
  WIGGLE = 'wiggle',
  SILHOUETTE = 'silhouette',
}

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

export enum Rotates {
  HORIZONTAL = 0,
  VERTICAL = 90,
  ANGLED = 75,
}

export enum ThresholdLineStyles {
  FULL = 'full',
  DASHED = 'dashed',
  DOT_DASHED = 'dot-dashed',
}

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

export enum GaugeTypes {
  ARC = 'Arc',
  CIRCLE = 'Circle',
}

export enum ColorModes {
  BACKGROUND = 'Background',
  LABELS = 'Labels',
  NONE = 'None',
}

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

export enum Alignments {
  AUTOMATIC = 'automatic',
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

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
