/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { isValidInterval } from '@kbn/data-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { AxisExtentModes, ValueLabelModes } from '../constants';
import {
  SeriesType,
  AxisExtentConfigResult,
  DataLayerConfigResult,
  CommonXYDataLayerConfigResult,
  ValueLabelMode,
  CommonXYDataLayerConfig,
  ExtendedDataLayerConfigResult,
} from '../types';
import { isTimeChart } from '../helpers';

export const errors = {
  markSizeAccessorForNonLineOrAreaChartsError: () =>
    i18n.translate(
      'expressionXY.reusable.function.dataLayer.errors.markSizeAccessorForNonLineOrAreaChartsError',
      {
        defaultMessage:
          "`markSizeAccessor` can't be used. Dots are applied only for line or area charts",
      }
    ),
  markSizeRatioLimitsError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.markSizeLimitsError', {
      defaultMessage: 'Mark size ratio must be greater or equal to 1 and less or equal to 100',
    }),
  lineWidthForNonLineOrAreaChartError: () =>
    i18n.translate(
      'expressionXY.reusable.function.xyVis.errors.lineWidthForNonLineOrAreaChartError',
      {
        defaultMessage: '`lineWidth` can be applied only for line or area charts',
      }
    ),
  showPointsForNonLineOrAreaChartError: () =>
    i18n.translate(
      'expressionXY.reusable.function.xyVis.errors.showPointsForNonLineOrAreaChartError',
      {
        defaultMessage: '`showPoints` can be applied only for line or area charts',
      }
    ),
  pointsRadiusForNonLineOrAreaChartError: () =>
    i18n.translate(
      'expressionXY.reusable.function.xyVis.errors.pointsRadiusForNonLineOrAreaChartError',
      {
        defaultMessage: '`pointsRadius` can be applied only for line or area charts',
      }
    ),
  linesVisibilityForNonLineChartError: () =>
    i18n.translate(
      'expressionXY.reusable.function.xyVis.errors.linesVisibilityForNonLineChartError',
      {
        defaultMessage: 'Lines visibility can be controlled only at line charts',
      }
    ),
  markSizeRatioWithoutAccessor: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.markSizeRatioWithoutAccessor', {
      defaultMessage: 'Mark size ratio can be applied only with `markSizeAccessor`',
    }),
  extendBoundsAreInvalidError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.extendBoundsAreInvalidError', {
      defaultMessage:
        'For area and bar modes, and custom extent mode, the lower bound should be less or greater than 0 and the upper bound - be greater or equal than 0',
    }),
  notUsedFillOpacityError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.notUsedFillOpacityError', {
      defaultMessage: '`fillOpacity` argument is applicable only for area charts.',
    }),
  valueLabelsForNotBarsOrHistogramBarsChartsError: () =>
    i18n.translate(
      'expressionXY.reusable.function.xyVis.errors.valueLabelsForNotBarsOrHistogramBarsChartsError',
      {
        defaultMessage:
          '`valueLabels` argument is applicable only for bar charts, which are not histograms.',
      }
    ),
  dataBoundsForNotLineChartError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.dataBoundsForNotLineChartError', {
      defaultMessage: 'Only line charts can be fit to the data bounds',
    }),
  extentFullModeIsInvalidError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.extentFullModeIsInvalid', {
      defaultMessage: 'For x axis extent, the full mode is not supported.',
    }),
  extentModeNotSupportedError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.extentModeNotSupportedError', {
      defaultMessage: 'X axis extent is only supported for numeric histograms.',
    }),
  timeMarkerForNotTimeChartsError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.timeMarkerForNotTimeChartsError', {
      defaultMessage: 'Only time charts can have current time marker',
    }),
  isInvalidIntervalError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.isInvalidIntervalError', {
      defaultMessage:
        'Provided x-axis interval is invalid. The interval should include quantity and unit names. Examples: 1d, 24h, 1w.',
    }),
  minTimeBarIntervalNotForTimeBarChartError: () =>
    i18n.translate(
      'expressionXY.reusable.function.xyVis.errors.minTimeBarIntervalNotForTimeBarChartError',
      {
        defaultMessage: '`minTimeBarInterval` argument is applicable only for time bar charts.',
      }
    ),
};

export const hasBarLayer = (layers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>) =>
  layers.filter(({ seriesType }) => seriesType.includes('bar')).length > 0;

export const hasAreaLayer = (layers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>) =>
  layers.filter(({ seriesType }) => seriesType.includes('area')).length > 0;

export const hasHistogramBarLayer = (
  layers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>
) =>
  layers.filter(({ seriesType, isHistogram }) => seriesType.includes('bar') && isHistogram).length >
  0;

export const isValidExtentWithCustomMode = (extent: AxisExtentConfigResult) => {
  const isValidLowerBound =
    extent.lowerBound === undefined || (extent.lowerBound !== undefined && extent.lowerBound <= 0);
  const isValidUpperBound =
    extent.upperBound === undefined || (extent.upperBound !== undefined && extent.upperBound >= 0);

  return isValidLowerBound && isValidUpperBound;
};

export const validateExtentForDataBounds = (
  extent: AxisExtentConfigResult,
  layers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>
) => {
  const lineSeries = layers.filter(({ seriesType }) => seriesType.includes('line'));
  if (!lineSeries.length && extent.mode === AxisExtentModes.DATA_BOUNDS) {
    throw new Error(errors.dataBoundsForNotLineChartError());
  }
};

export const validateXExtent = (
  extent: AxisExtentConfigResult | undefined,
  dataLayers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>
) => {
  if (extent) {
    if (extent.mode === AxisExtentModes.FULL) {
      throw new Error(errors.extentFullModeIsInvalidError());
    }
    if (isTimeChart(dataLayers) || dataLayers.every(({ isHistogram }) => !isHistogram)) {
      throw new Error(errors.extentModeNotSupportedError());
    }
  }
};

export const validateExtent = (
  extent: AxisExtentConfigResult,
  hasBarOrArea: boolean,
  dataLayers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>
) => {
  if (
    extent.mode === AxisExtentModes.CUSTOM &&
    hasBarOrArea &&
    !isValidExtentWithCustomMode(extent)
  ) {
    throw new Error(errors.extendBoundsAreInvalidError());
  }

  validateExtentForDataBounds(extent, dataLayers);
};

export const validateFillOpacity = (fillOpacity: number | undefined, hasArea: boolean) => {
  if (fillOpacity !== undefined && !hasArea) {
    throw new Error(errors.notUsedFillOpacityError());
  }
};

export const validateValueLabels = (
  valueLabels: ValueLabelMode,
  hasBar: boolean,
  hasNotHistogramBars: boolean
) => {
  if ((!hasBar || !hasNotHistogramBars) && valueLabels !== ValueLabelModes.HIDE) {
    throw new Error(errors.valueLabelsForNotBarsOrHistogramBarsChartsError());
  }
};

const isAreaOrLineChart = (seriesType: SeriesType) =>
  seriesType.includes('line') || seriesType.includes('area');

export const validateAddTimeMarker = (
  dataLayers: Array<DataLayerConfigResult | ExtendedDataLayerConfigResult>,
  addTimeMarker?: boolean
) => {
  if (addTimeMarker && !isTimeChart(dataLayers)) {
    throw new Error(errors.timeMarkerForNotTimeChartsError());
  }
};

export const validateMarkSizeForChartType = (
  markSizeAccessor: ExpressionValueVisDimension | string | undefined,
  seriesType: SeriesType
) => {
  if (markSizeAccessor && !seriesType.includes('line') && !seriesType.includes('area')) {
    throw new Error(errors.markSizeAccessorForNonLineOrAreaChartsError());
  }
};

export const validateMarkSizeRatioLimits = (markSizeRatio?: number) => {
  if (markSizeRatio !== undefined && (markSizeRatio < 1 || markSizeRatio > 100)) {
    throw new Error(errors.markSizeRatioLimitsError());
  }
};

export const validateLineWidthForChartType = (
  lineWidth: number | undefined,
  seriesType: SeriesType
) => {
  if (lineWidth !== undefined && !isAreaOrLineChart(seriesType)) {
    throw new Error(errors.lineWidthForNonLineOrAreaChartError());
  }
};

export const validateShowPointsForChartType = (
  showPoints: boolean | undefined,
  seriesType: SeriesType
) => {
  if (showPoints !== undefined && !isAreaOrLineChart(seriesType)) {
    throw new Error(errors.showPointsForNonLineOrAreaChartError());
  }
};

export const validatePointsRadiusForChartType = (
  pointsRadius: number | undefined,
  seriesType: SeriesType
) => {
  if (pointsRadius !== undefined && !isAreaOrLineChart(seriesType)) {
    throw new Error(errors.pointsRadiusForNonLineOrAreaChartError());
  }
};

export const validateLinesVisibilityForChartType = (
  showLines: boolean | undefined,
  seriesType: SeriesType
) => {
  if (showLines && !(seriesType.includes('line') || seriesType.includes('area'))) {
    throw new Error(errors.linesVisibilityForNonLineChartError());
  }
};

export const validateMarkSizeRatioWithAccessor = (
  markSizeRatio: number | undefined,
  markSizeAccessor: ExpressionValueVisDimension | string | undefined
) => {
  if (markSizeRatio !== undefined && !markSizeAccessor) {
    throw new Error(errors.markSizeRatioWithoutAccessor());
  }
};

export const validateMinTimeBarInterval = (
  dataLayers: CommonXYDataLayerConfigResult[],
  hasBar: boolean,
  minTimeBarInterval?: string
) => {
  if (minTimeBarInterval) {
    if (!isValidInterval(minTimeBarInterval)) {
      throw new Error(errors.isInvalidIntervalError());
    }

    if (!hasBar || !isTimeChart(dataLayers)) {
      throw new Error(errors.minTimeBarIntervalNotForTimeBarChartError());
    }
  }
};
