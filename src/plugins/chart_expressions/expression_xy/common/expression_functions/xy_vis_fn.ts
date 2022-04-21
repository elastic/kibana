/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Dimension, prepareLogTable } from '@kbn/visualizations-plugin/common/utils';
import {
  AxisExtentModes,
  LayerTypes,
  ValueLabelModes,
  XY_VIS_RENDERER,
  SeriesTypes,
} from '../constants';
import { appendLayerIds } from '../helpers';
import {
  AxisExtentConfigResult,
  DataLayerConfigResult,
  XYLayerConfig,
  XyVisFn,
  YAxisConfigResult,
} from '../types';
import { getLayerDimensions } from '../utils';

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

function areValidBounds(extent: AxisExtentConfigResult) {
  const isValidLowerBound =
    extent.lowerBound === undefined || (extent.lowerBound !== undefined && extent.lowerBound <= 0);
  const isValidUpperBound =
    extent.upperBound === undefined || (extent.upperBound !== undefined && extent.upperBound >= 0);

  return isValidLowerBound && isValidUpperBound;
}

const validateExtents = (dataLayers: DataLayerConfigResult[], axes?: YAxisConfigResult[]) => {
  const lineSeries = dataLayers.filter(({ seriesType }) => seriesType === SeriesTypes.LINE);
  const hasBarOrArea =
    dataLayers.filter(
      ({ seriesType }) => seriesType === SeriesTypes.BAR || seriesType === SeriesTypes.AREA
    ).length > 0;
  axes?.forEach((axis) => {
    if (
      hasBarOrArea &&
      axis.extent?.mode === AxisExtentModes.CUSTOM &&
      !areValidBounds(axis.extent)
    ) {
      throw new Error(errors.extendBoundsAreInvalidError());
    }

    if (!lineSeries.length && axis.extent?.mode === AxisExtentModes.DATA_BOUNDS) {
      throw new Error(errors.dataBoundsForNotLineChartError());
    }
  });
};

export const xyVisFn: XyVisFn['fn'] = async (data, args, handlers) => {
  const { dataLayers = [], referenceLineLayers = [], annotationLayers = [], ...restArgs } = args;
  const layers: XYLayerConfig[] = [
    ...appendLayerIds(dataLayers, 'dataLayers'),
    ...appendLayerIds(referenceLineLayers, 'referenceLineLayers'),
    ...appendLayerIds(annotationLayers, 'annotationLayers'),
  ];

  if (handlers.inspectorAdapters.tables) {
    const layerDimensions = layers.reduce<Dimension[]>((dimensions, layer) => {
      if (layer.layerType === LayerTypes.ANNOTATIONS) {
        return dimensions;
      }

      return [...dimensions, ...getLayerDimensions(layer)];
    }, []);

    const logTable = prepareLogTable(data, layerDimensions, true);
    handlers.inspectorAdapters.tables.logDatatable('default', logTable);
  }

  const hasBar = dataLayers.filter(({ seriesType }) => seriesType.includes('bar')).length > 0;
  const hasArea = dataLayers.filter(({ seriesType }) => seriesType.includes('area')).length > 0;

  validateExtents(dataLayers, args.axes);

  if (!hasArea && args.fillOpacity !== undefined) {
    throw new Error(errors.notUsedFillOpacityError());
  }

  const hasNotHistogramBars =
    dataLayers.filter(({ seriesType, isHistogram }) => seriesType.includes('bar') && !isHistogram)
      .length > 0;

  if ((!hasBar || !hasNotHistogramBars) && args.valueLabels !== ValueLabelModes.HIDE) {
    throw new Error(errors.valueLabelsForNotBarsOrHistogramBarsChartsError());
  }

  return {
    type: 'render',
    as: XY_VIS_RENDERER,
    value: {
      args: {
        ...restArgs,
        layers,
        ariaLabel:
          args.ariaLabel ??
          (handlers.variables?.embeddableTitle as string) ??
          handlers.getExecutionContext?.()?.description,
      },
    },
  };
};
