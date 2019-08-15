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

export enum LegendPositions {
  RIGHT = 'right',
  LEFT = 'left',
  TOP = 'top',
  BOTTOM = 'bottom',
}

const getLegendPositions = () => [
  {
    text: i18n.translate('kbnVislibVisTypes.legendPositions.topText', {
      defaultMessage: 'Top',
    }),
    value: LegendPositions.TOP,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.legendPositions.leftText', {
      defaultMessage: 'Left',
    }),
    value: LegendPositions.LEFT,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.legendPositions.rightText', {
      defaultMessage: 'Right',
    }),
    value: LegendPositions.RIGHT,
  },
  {
    text: i18n.translate('kbnVislibVisTypes.legendPositions.bottomText', {
      defaultMessage: 'Bottom',
    }),
    value: LegendPositions.BOTTOM,
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
    text: i18n.translate('kbnVislibVisTypes.chartTypes.histogramText', {
      defaultMessage: 'Histogram',
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

export { getLegendPositions, getChartTypes, getChartModes, getInterpolationModes };
