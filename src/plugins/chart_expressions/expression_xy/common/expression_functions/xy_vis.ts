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
} from '../types';
import {
  XY_VIS,
  DATA_LAYER,
  XYCurveTypes,
  LEGEND_CONFIG,
  ValueLabelModes,
  FittingFunctions,
  GRID_LINES_CONFIG,
  XY_VIS_RENDERER,
  AXIS_EXTENT_CONFIG,
  TICK_LABELS_CONFIG,
  REFERENCE_LINE_LAYER,
  LABELS_ORIENTATION_CONFIG,
  AXIS_TITLES_VISIBILITY_CONFIG,
  EndValues,
  ANNOTATION_LAYER,
  LayerTypes,
  AxisExtentModes,
} from '../constants';
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

const validateExtent = (
  extent: AxisExtentConfigResult,
  hasBarOrArea: boolean,
  dataLayers: DataLayerConfigResult[]
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
    xTitle: {
      types: ['string'],
      help: i18n.translate('expressionXY.xyVis.xTitle.help', {
        defaultMessage: 'X axis title',
      }),
    },
    yTitle: {
      types: ['string'],
      help: i18n.translate('expressionXY.xyVis.yLeftTitle.help', {
        defaultMessage: 'Y left axis title',
      }),
    },
    yRightTitle: {
      types: ['string'],
      help: i18n.translate('expressionXY.xyVis.yRightTitle.help', {
        defaultMessage: 'Y right axis title',
      }),
    },
    yLeftExtent: {
      types: [AXIS_EXTENT_CONFIG],
      help: i18n.translate('expressionXY.xyVis.yLeftExtent.help', {
        defaultMessage: 'Y left axis extents',
      }),
      default: `{${AXIS_EXTENT_CONFIG}}`,
    },
    yRightExtent: {
      types: [AXIS_EXTENT_CONFIG],
      help: i18n.translate('expressionXY.xyVis.yRightExtent.help', {
        defaultMessage: 'Y right axis extents',
      }),
      default: `{${AXIS_EXTENT_CONFIG}}`,
    },
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
    tickLabelsVisibilitySettings: {
      types: [TICK_LABELS_CONFIG],
      help: i18n.translate('expressionXY.xyVis.tickLabelsVisibilitySettings.help', {
        defaultMessage: 'Show x and y axes tick labels',
      }),
    },
    labelsOrientation: {
      types: [LABELS_ORIENTATION_CONFIG],
      help: i18n.translate('expressionXY.xyVis.labelsOrientation.help', {
        defaultMessage: 'Defines the rotation of the axis labels',
      }),
    },
    gridlinesVisibilitySettings: {
      types: [GRID_LINES_CONFIG],
      help: i18n.translate('expressionXY.xyVis.gridlinesVisibilitySettings.help', {
        defaultMessage: 'Show x and y axes gridlines',
      }),
    },
    axisTitlesVisibilitySettings: {
      types: [AXIS_TITLES_VISIBILITY_CONFIG],
      help: i18n.translate('expressionXY.xyVis.axisTitlesVisibilitySettings.help', {
        defaultMessage: 'Show x and y axes titles',
      }),
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
    showTooltip: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('expressionXY.xyVis.showTooltip.help', {
        defaultMessage: 'Show tooltip',
      }),
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

    validateExtent(args.yLeftExtent, hasBar || hasArea, dataLayers);
    validateExtent(args.yRightExtent, hasBar || hasArea, dataLayers);

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
          showTooltip: args.showTooltip ?? false,
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
