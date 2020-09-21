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
import { Position } from '@elastic/charts';

import { AxisMode, ChartMode, InterpolationMode, ThresholdLineStyle, ScaleType } from '../types';
import { ChartType } from '../../common/types';
import { LabelRotation } from '../../../charts/public';

export const getPositions = () => [
  {
    text: i18n.translate('visTypeXy.legendPositions.topText', {
      defaultMessage: 'Top',
    }),
    value: Position.Top,
  },
  {
    text: i18n.translate('visTypeXy.legendPositions.leftText', {
      defaultMessage: 'Left',
    }),
    value: Position.Left,
  },
  {
    text: i18n.translate('visTypeXy.legendPositions.rightText', {
      defaultMessage: 'Right',
    }),
    value: Position.Right,
  },
  {
    text: i18n.translate('visTypeXy.legendPositions.bottomText', {
      defaultMessage: 'Bottom',
    }),
    value: Position.Bottom,
  },
];

export const getChartTypes = () => [
  {
    text: i18n.translate('visTypeXy.chartTypes.lineText', {
      defaultMessage: 'Line',
    }),
    value: ChartType.Line,
  },
  {
    text: i18n.translate('visTypeXy.chartTypes.areaText', {
      defaultMessage: 'Area',
    }),
    value: ChartType.Area,
  },
  {
    text: i18n.translate('visTypeXy.chartTypes.barText', {
      defaultMessage: 'Bar',
    }),
    value: ChartType.Histogram,
  },
];

export const getChartModes = () => [
  {
    text: i18n.translate('visTypeXy.chartModes.normalText', {
      defaultMessage: 'Normal',
    }),
    value: ChartMode.Normal,
  },
  {
    text: i18n.translate('visTypeXy.chartModes.stackedText', {
      defaultMessage: 'Stacked',
    }),
    value: ChartMode.Stacked,
  },
];

export const getInterpolationModes = () => [
  {
    text: i18n.translate('visTypeXy.interpolationModes.straightText', {
      defaultMessage: 'Straight',
    }),
    value: InterpolationMode.Linear,
  },
  {
    text: i18n.translate('visTypeXy.interpolationModes.smoothedText', {
      defaultMessage: 'Smoothed',
    }),
    value: InterpolationMode.Cardinal,
  },
  {
    text: i18n.translate('visTypeXy.interpolationModes.steppedText', {
      defaultMessage: 'Stepped',
    }),
    value: InterpolationMode.StepAfter,
  },
];

export const getScaleTypes = () => [
  {
    text: i18n.translate('visTypeXy.scaleTypes.linearText', {
      defaultMessage: 'Linear',
    }),
    value: ScaleType.Linear,
  },
  {
    text: i18n.translate('visTypeXy.scaleTypes.logText', {
      defaultMessage: 'Log',
    }),
    value: ScaleType.Log,
  },
  {
    text: i18n.translate('visTypeXy.scaleTypes.squareRootText', {
      defaultMessage: 'Square root',
    }),
    value: ScaleType.SquareRoot,
  },
];

export const getAxisModes = () => [
  {
    text: i18n.translate('visTypeXy.axisModes.normalText', {
      defaultMessage: 'Normal',
    }),
    value: AxisMode.Normal,
  },
  {
    text: i18n.translate('visTypeXy.axisModes.percentageText', {
      defaultMessage: 'Percentage',
    }),
    value: AxisMode.Percentage,
  },
  {
    text: i18n.translate('visTypeXy.axisModes.wiggleText', {
      defaultMessage: 'Wiggle',
    }),
    value: AxisMode.Wiggle,
  },
  {
    text: i18n.translate('visTypeXy.axisModes.silhouetteText', {
      defaultMessage: 'Silhouette',
    }),
    value: AxisMode.Silhouette,
  },
];

export const getThresholdLineStyles = () => [
  {
    value: ThresholdLineStyle.Full,
    text: i18n.translate('visTypeXy.thresholdLine.style.fullText', {
      defaultMessage: 'Full',
    }),
  },
  {
    value: ThresholdLineStyle.Dashed,
    text: i18n.translate('visTypeXy.thresholdLine.style.dashedText', {
      defaultMessage: 'Dashed',
    }),
  },
  {
    value: ThresholdLineStyle.DotDashed,
    text: i18n.translate('visTypeXy.thresholdLine.style.dotdashedText', {
      defaultMessage: 'Dot-dashed',
    }),
  },
];

export const getRotateOptions = () => [
  {
    text: i18n.translate('visTypeXy.categoryAxis.rotate.horizontalText', {
      defaultMessage: 'Horizontal',
    }),
    value: LabelRotation.Horizontal,
  },
  {
    text: i18n.translate('visTypeXy.categoryAxis.rotate.verticalText', {
      defaultMessage: 'Vertical',
    }),
    value: LabelRotation.Vertical,
  },
  {
    text: i18n.translate('visTypeXy.categoryAxis.rotate.angledText', {
      defaultMessage: 'Angled',
    }),
    value: LabelRotation.Angled,
  },
];

export const getConfigCollections = () => ({
  legendPositions: getPositions(),
  positions: getPositions(),
  chartTypes: getChartTypes(),
  axisModes: getAxisModes(),
  scaleTypes: getScaleTypes(),
  chartModes: getChartModes(),
  interpolationModes: getInterpolationModes(),
  thresholdLineStyles: getThresholdLineStyles(),
});
