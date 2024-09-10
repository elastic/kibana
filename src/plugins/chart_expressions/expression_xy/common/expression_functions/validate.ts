/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { isValidInterval } from '@kbn/data-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { AxisExtentModes, ValueLabelModes, SeriesTypes } from '../constants';
import {
  SeriesType,
  AxisExtentConfigResult,
  DataLayerConfigResult,
  CommonXYDataLayerConfigResult,
  ValueLabelMode,
  CommonXYDataLayerConfig,
  YAxisConfigResult,
  ExtendedDataLayerConfigResult,
  XAxisConfigResult,
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
  valueLabelsForNotBarsChartsError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.valueLabelsForNotBarChartsError', {
      defaultMessage: '`valueLabels` argument is applicable only for bar charts.',
    }),
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
  invalidMinBarHeightError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.invalidMinBarHeightError', {
      defaultMessage:
        'The min bar height should be a positive integer, representing pixel height of the bar.',
    }),
  axisIsNotAssignedError: (axisId: string) =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.axisIsNotAssignedError', {
      defaultMessage: `Axis with id: "{axisId}" is not assigned to any accessor. Please assign axis using the following construction: \`decorations='{dataDecorationConfig forAccessor="your-accessor" axisId="{axisId}"}'\``,
      values: { axisId },
    }),
};

export const hasBarLayer = (layers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>) =>
  layers.some(({ seriesType }) => seriesType === SeriesTypes.BAR);

export const hasAreaLayer = (layers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>) =>
  layers.some(({ seriesType }) => seriesType === SeriesTypes.AREA);

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
  const hasLineSeries = layers.some(({ seriesType }) => seriesType === SeriesTypes.LINE);
  if (!hasLineSeries && extent.mode === AxisExtentModes.DATA_BOUNDS) {
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

export const validateExtents = (
  dataLayers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>,
  hasBarOrArea: boolean,
  yAxisConfigs?: YAxisConfigResult[],
  xAxisConfig?: XAxisConfigResult
) => {
  yAxisConfigs?.forEach((axis) => {
    if (!axis.extent || axis.extent.enforce) {
      return;
    }
    if (
      hasBarOrArea &&
      axis.extent?.mode === AxisExtentModes.CUSTOM &&
      !isValidExtentWithCustomMode(axis.extent)
    ) {
      throw new Error(errors.extendBoundsAreInvalidError());
    }

    validateExtentForDataBounds(axis.extent, dataLayers);
  });

  validateXExtent(xAxisConfig?.extent, dataLayers);
};

export const validateAxes = (
  dataLayers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>,
  yAxisConfigs?: YAxisConfigResult[]
) => {
  yAxisConfigs?.forEach((axis) => {
    if (
      axis.id &&
      dataLayers.every(
        (layer) =>
          !layer.decorations ||
          layer.decorations?.every((decorationConfig) => decorationConfig.axisId !== axis.id)
      )
    ) {
      throw new Error(errors.axisIsNotAssignedError(axis.id));
    }
  });
};

export const validateFillOpacity = (fillOpacity: number | undefined, hasArea: boolean) => {
  if (fillOpacity !== undefined && !hasArea) {
    throw new Error(errors.notUsedFillOpacityError());
  }
};

export const validateValueLabels = (valueLabels: ValueLabelMode, hasBar: boolean) => {
  if (!hasBar && valueLabels !== ValueLabelModes.HIDE) {
    throw new Error(errors.valueLabelsForNotBarsChartsError());
  }
};

const isAreaOrLineChart = (seriesType: SeriesType) =>
  seriesType === SeriesTypes.LINE || seriesType === SeriesTypes.AREA;

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
  if (markSizeAccessor && !isAreaOrLineChart(seriesType)) {
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
  if (showLines && !isAreaOrLineChart(seriesType)) {
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

export const validateMinBarHeight = (minBarHeight?: number) => {
  if (minBarHeight !== undefined && minBarHeight < 0) {
    throw new Error(errors.invalidMinBarHeightError());
  }
};
