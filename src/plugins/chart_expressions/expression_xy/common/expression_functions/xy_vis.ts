/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition, Datatable } from '../../../../expressions';
import { XYArgs, XYLayerConfigResult, XYRender } from '../types';
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
} from '../constants';
import { Dimension, prepareLogTable } from '../../../../visualizations/common/utils';
import { getLayerDimensions } from '../utils';

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
      required: false,
    },
  },
  fn(data, args, handlers) {
    const { dataLayers, referenceLineLayers, annotationLayers, ...restArgs } = args;
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
