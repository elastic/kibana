/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition, Datatable } from '../../../../expressions';
import { LayeredXYArgs, XYExtendedLayerConfigResult, XYRender } from '../types';
import {
  XYCurveTypes,
  LEGEND_CONFIG,
  ValueLabelModes,
  FittingFunctions,
  GRID_LINES_CONFIG,
  XY_VIS_RENDERER,
  AXIS_EXTENT_CONFIG,
  TICK_LABELS_CONFIG,
  LABELS_ORIENTATION_CONFIG,
  AXIS_TITLES_VISIBILITY_CONFIG,
  EXTENDED_DATA_LAYER,
  EXTENDED_REFERENCE_LINE_LAYER,
  LAYERED_XY_VIS,
  EndValues,
  EXTENDED_ANNOTATION_LAYER,
} from '../constants';
import { logDatatables } from '../utils';

export const layeredXyVisFunction: ExpressionFunctionDefinition<
  typeof LAYERED_XY_VIS,
  Datatable,
  LayeredXYArgs,
  XYRender
> = {
  name: LAYERED_XY_VIS,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('expressionXY.xyVis.help', {
    defaultMessage: 'An X/Y chart',
  }),
  args: {
    title: {
      types: ['string'],
      help: 'The chart title.',
    },
    description: {
      types: ['string'],
      help: '',
    },
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
    },
    yRightExtent: {
      types: [AXIS_EXTENT_CONFIG],
      help: i18n.translate('expressionXY.xyVis.yRightExtent.help', {
        defaultMessage: 'Y right axis extents',
      }),
    },
    legend: {
      types: [LEGEND_CONFIG],
      help: i18n.translate('expressionXY.xyVis.legend.help', {
        defaultMessage: 'Configure the chart legend.',
      }),
    },
    fittingFunction: {
      types: ['string'],
      options: [...Object.values(FittingFunctions)],
      help: i18n.translate('expressionXY.xyVis.fittingFunction.help', {
        defaultMessage: 'Define how missing values are treated',
      }),
    },
    endValue: {
      types: ['string'],
      options: [...Object.values(EndValues)],
      help: i18n.translate('expressionXY.xyVis.endValue.help', {
        defaultMessage: 'End value',
      }),
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
    layers: {
      types: [EXTENDED_DATA_LAYER, EXTENDED_REFERENCE_LINE_LAYER, EXTENDED_ANNOTATION_LAYER],
      help: i18n.translate('expressionXY.layeredXyVis.layers.help', {
        defaultMessage: 'Layers of visual series',
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
      required: false,
    },
  },
  fn(data, args, handlers) {
    const layers = args.layers.filter<XYExtendedLayerConfigResult>(
      (layer): layer is XYExtendedLayerConfigResult => layer !== undefined
    );

    logDatatables(layers, handlers);

    return {
      type: 'render',
      as: XY_VIS_RENDERER,
      value: {
        args: {
          ...args,
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
