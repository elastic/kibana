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
  AxisExtentConfigResult,
  DataLayerConfigResult,
  ValueLabelMode,
  CommonXYDataLayerConfig,
} from '../types';

const errors = {
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

export const validateExtent = (
  extent: AxisExtentConfigResult,
  hasBarOrArea: boolean,
  dataLayers: Array<DataLayerConfigResult | CommonXYDataLayerConfig>
) => {
  const isValidLowerBound =
    extent.lowerBound === undefined || (extent.lowerBound !== undefined && extent.lowerBound <= 0);
  const isValidUpperBound =
    extent.upperBound === undefined || (extent.upperBound !== undefined && extent.upperBound >= 0);

  const areValidBounds = isValidLowerBound && isValidUpperBound;

  if (hasBarOrArea && extent.mode === AxisExtentModes.CUSTOM && !areValidBounds) {
    throw new Error(errors.extendBoundsAreInvalidError());
  }

  const lineSeries = dataLayers.filter(({ seriesType }) => seriesType.includes('line'));
  if (!lineSeries.length && extent.mode === AxisExtentModes.DATA_BOUNDS) {
    throw new Error(errors.dataBoundsForNotLineChartError());
  }
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
