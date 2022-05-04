/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { AxisExtentModes, ValueLabelModes } from '../constants';
import {
  SeriesType,
  AxisExtentConfigResult,
  DataLayerConfigResult,
  ValueLabelMode,
  CommonXYDataLayerConfig,
} from '../types';

const errors = {
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

export const validateMarkSizeForChartType = (
  markSizeAccessor: string | undefined,
  seriesType: SeriesType
) => {
  if (markSizeAccessor && !seriesType.includes('line') && !seriesType.includes('area')) {
    throw new Error(errors.markSizeAccessorForNonLineOrAreaChartsError());
  }
};

export const validateMarkSizeRatioLimits = (markSizeRatio: number) => {
  if (markSizeRatio < 1 || markSizeRatio > 100) {
    throw new Error(errors.markSizeRatioLimitsError());
  }
};
