/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition, Datatable } from '@kbn/expressions-plugin';
import { Dimension, prepareLogTable } from '@kbn/visualizations-plugin/common/utils';
import {
  AxisExtentConfigResult,
  DataLayerConfigResult,
  XYArgs,
  XYLayerConfigResult,
  XYRender,
  YAxisConfigResult,
} from '../types';
import {
  XY_VIS,
  DATA_LAYER,
  XYCurveTypes,
  LEGEND_CONFIG,
  ValueLabelModes,
  FittingFunctions,
  XY_VIS_RENDERER,
  REFERENCE_LINE_LAYER,
  EndValues,
  ANNOTATION_LAYER,
  LayerTypes,
  X_AXIS_CONFIG,
  Y_AXIS_CONFIG,
  AxisModes,
  AxisExtentModes,
  SeriesTypes,
} from '../constants';
import { getLayerDimensions } from '../utils';

function validateLayerMode(layers: DataLayerConfigResult[], axes: YAxisConfigResult[]) {
  const isError = layers.some(
    (layer) =>
      layer.isPercentage &&
      axes.some(
        (axis) =>
          axis.mode !== AxisModes.PERCENTAGE &&
          layer.yConfig?.some((config) => config.axisId === axis.id)
      )
  );
  if (isError) {
    throw new Error(
      i18n.translate('expressionXY.xyVis.errors.conflictAxisModeError', {
        defaultMessage: 'Layer has percentage mode but related axes has another one',
      })
    );
  }
}
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

export const xyVisFunction: ExpressionFunctionDefinition<
  typeof XY_VIS,
  Datatable,
  XYArgs,
  XYRender
> = {
  name: XY_VIS,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('expressionXY.xyVis.help', {
    defaultMessage: 'An X/Y chart',
  }),
  args: {
    legend: {
      types: [LEGEND_CONFIG],
      help: i18n.translate('expressionXY.xyVis.legend.help', {
        defaultMessage: 'Configure the chart legend.',
      }),
      default: `{${LEGEND_CONFIG}}`,
    },
    fittingFunction: {
      types: ['string'],
      options: [...Object.values(FittingFunctions)],
      help: i18n.translate('expressionXY.xyVis.fittingFunction.help', {
        defaultMessage: 'Define how missing values are treated',
      }),
      strict: true,
    },
    endValue: {
      types: ['string'],
      options: [...Object.values(EndValues)],
      help: i18n.translate('expressionXY.xyVis.endValue.help', {
        defaultMessage: 'End value',
      }),
      strict: true,
    },
    emphasizeFitting: {
      types: ['boolean'],
      default: false,
      help: '',
    },
    valueLabels: {
      types: ['string'],
      options: [...Object.values(ValueLabelModes)],
      help: i18n.translate('expressionXY.xyVis.valueLabels.help', {
        defaultMessage: 'Value labels mode',
      }),
      strict: true,
      default: ValueLabelModes.HIDE,
    },
    dataLayers: {
      types: [DATA_LAYER],
      help: i18n.translate('expressionXY.xyVis.dataLayer.help', {
        defaultMessage: 'Data layer of visual series',
      }),
      multi: true,
    },
    referenceLineLayers: {
      types: [REFERENCE_LINE_LAYER],
      help: i18n.translate('expressionXY.xyVis.referenceLineLayer.help', {
        defaultMessage: 'Reference line layer',
      }),
      multi: true,
    },
    annotationLayers: {
      types: [ANNOTATION_LAYER],
      help: i18n.translate('expressionXY.xyVis.annotationLayer.help', {
        defaultMessage: 'Annotation layer',
      }),
      multi: true,
    },
    curveType: {
      types: ['string'],
      options: [...Object.values(XYCurveTypes)],
      help: i18n.translate('expressionXY.xyVis.curveType.help', {
        defaultMessage: 'Define how curve type is rendered for a line chart',
      }),
    },
    fillOpacity: {
      types: ['number'],
      help: i18n.translate('expressionXY.xyVis.fillOpacity.help', {
        defaultMessage: 'Define the area chart fill opacity',
      }),
    },
    hideEndzones: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('expressionXY.xyVis.hideEndzones.help', {
        defaultMessage: 'Hide endzone markers for partial data',
      }),
    },
    valuesInLegend: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('expressionXY.xyVis.valuesInLegend.help', {
        defaultMessage: 'Show values in legend',
      }),
    },
    ariaLabel: {
      types: ['string'],
      help: i18n.translate('expressionXY.xyVis.ariaLabel.help', {
        defaultMessage: 'Specifies the aria label of the xy chart',
      }),
    },
    xAxisConfig: {
      types: [X_AXIS_CONFIG],
      help: i18n.translate('expressionXY.xyVis.xAxisConfig.help', {
        defaultMessage: 'Specifies the configs for x-axis',
      }),
    },
    axes: {
      types: [Y_AXIS_CONFIG],
      help: i18n.translate('expressionXY.xyVis.axes.help', {
        defaultMessage: 'Specifies the configs for y-axes',
      }),
      multi: true,
    },
  },
  fn(data, args, handlers) {
    const { dataLayers = [], referenceLineLayers = [], annotationLayers = [], ...restArgs } = args;
    const inputLayers: Array<XYLayerConfigResult | undefined> = [
      ...dataLayers,
      ...referenceLineLayers,
      ...annotationLayers,
    ];

    const layers: XYLayerConfigResult[] = inputLayers.filter(
      (layer): layer is XYLayerConfigResult => layer !== undefined
    );

    validateLayerMode(dataLayers, args.axes || []);

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

    const hasBar = dataLayers.filter(({ seriesType }) => seriesType === SeriesTypes.BAR).length > 0;
    const hasArea =
      dataLayers.filter(({ seriesType }) => seriesType === SeriesTypes.AREA).length > 0;

    validateExtents(dataLayers, args.axes);

    if (!hasArea && args.fillOpacity !== undefined) {
      throw new Error(errors.notUsedFillOpacityError());
    }

    const hasNotHistogramBars =
      dataLayers.filter(
        ({ seriesType, isHistogram }) => seriesType === SeriesTypes.BAR && !isHistogram
      ).length > 0;

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
  },
};
