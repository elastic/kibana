/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Fit } from '@elastic/charts';

import { LabelRotation } from '@kbn/charts-plugin/public';
import { AxisMode, ChartMode, InterpolationMode, ThresholdLineStyle } from '../types';
import { ChartType } from '../../common';
import { getScaleTypes } from './scale_types';
import { getPositions } from './positions';

export { getScaleTypes, getPositions };

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

export const getFittingFunctions = () => [
  {
    value: Fit.None,
    text: i18n.translate('visTypeXy.fittingFunctionsTitle.none', {
      defaultMessage: 'Hide (Do not fill gaps)',
    }),
  },
  {
    value: Fit.Zero,
    text: i18n.translate('visTypeXy.fittingFunctionsTitle.zero', {
      defaultMessage: 'Zero (Fill gaps with zeros)',
    }),
  },
  {
    value: Fit.Linear,
    text: i18n.translate('visTypeXy.fittingFunctionsTitle.linear', {
      defaultMessage: 'Linear (Fill gaps with a line)',
    }),
  },
  {
    value: Fit.Carry,
    text: i18n.translate('visTypeXy.fittingFunctionsTitle.carry', {
      defaultMessage: 'Last (Fill gaps with the last value)',
    }),
  },
  {
    value: Fit.Lookahead,
    text: i18n.translate('visTypeXy.fittingFunctionsTitle.lookahead', {
      defaultMessage: 'Next (Fill gaps with the next value)',
    }),
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
  fittingFunctions: getFittingFunctions(),
});
