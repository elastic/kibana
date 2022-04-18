/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { validateAccessor } from '@kbn/visualizations-plugin/common/utils';
import { DataLayerArgs, DataLayerConfigResult } from '../types';
import {
  DATA_LAYER,
  LayerTypes,
  SeriesTypes,
  XScaleTypes,
  YScaleTypes,
  Y_CONFIG,
} from '../constants';
import {
  validateLinesVisibilityForChartType,
  validateLineWidthForChartType,
  validateMarkSizeForChartType,
  validatePointsRadiusForChartType,
  validateShowPointsForChartType,
} from './validate';

export const dataLayerFunction: ExpressionFunctionDefinition<
  typeof DATA_LAYER,
  Datatable,
  DataLayerArgs,
  DataLayerConfigResult
> = {
  name: DATA_LAYER,
  aliases: [],
  type: DATA_LAYER,
  help: i18n.translate('expressionXY.dataLayer.help', {
    defaultMessage: `Configure a layer in the xy chart`,
  }),
  inputTypes: ['datatable'],
  args: {
    hide: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('expressionXY.dataLayer.hide.help', {
        defaultMessage: 'Show / hide axis',
      }),
    },
    xAccessor: {
      types: ['string'],
      help: i18n.translate('expressionXY.dataLayer.xAccessor.help', {
        defaultMessage: 'X-axis',
      }),
    },
    seriesType: {
      types: ['string'],
      options: [...Object.values(SeriesTypes)],
      help: i18n.translate('expressionXY.dataLayer.seriesType.help', {
        defaultMessage: 'The type of chart to display.',
      }),
      required: true,
      strict: true,
    },
    xScaleType: {
      options: [...Object.values(XScaleTypes)],
      help: i18n.translate('expressionXY.dataLayer.xScaleType.help', {
        defaultMessage: 'The scale type of the x axis',
      }),
      default: XScaleTypes.ORDINAL,
      strict: true,
    },
    isHistogram: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('expressionXY.dataLayer.isHistogram.help', {
        defaultMessage: 'Whether to layout the chart as a histogram',
      }),
    },
    yScaleType: {
      options: [...Object.values(YScaleTypes)],
      help: i18n.translate('expressionXY.dataLayer.yScaleType.help', {
        defaultMessage: 'The scale type of the y axes',
      }),
      default: YScaleTypes.LINEAR,
      strict: true,
    },
    splitAccessor: {
      types: ['string'],
      help: i18n.translate('expressionXY.dataLayer.splitAccessor.help', {
        defaultMessage: 'The column to split by',
      }),
    },
    markSizeAccessor: {
      types: ['string'],
      help: i18n.translate('expressionXY.dataLayer.markSizeAccessor.help', {
        defaultMessage: 'Mark size accessor',
      }),
    },
    lineWidth: {
      types: ['number'],
      help: i18n.translate('expressionXY.dataLayer.lineWidth.help', {
        defaultMessage: 'Line width',
      }),
    },
    showPoints: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.dataLayer.showPoints.help', {
        defaultMessage: 'Show points',
      }),
    },
    pointsRadius: {
      types: ['number'],
      help: i18n.translate('expressionXY.dataLayer.pointsRadius.help', {
        defaultMessage: 'Points radius',
      }),
    },
    showLines: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.dataLayer.showLines.help', {
        defaultMessage: 'Show lines between points',
      }),
      default: true,
    },
    accessors: {
      types: ['string'],
      help: i18n.translate('expressionXY.dataLayer.accessors.help', {
        defaultMessage: 'The columns to display on the y axis.',
      }),
      multi: true,
    },
    yConfig: {
      types: [Y_CONFIG],
      help: i18n.translate('expressionXY.dataLayer.yConfig.help', {
        defaultMessage: 'Additional configuration for y axes',
      }),
      multi: true,
    },
    columnToLabel: {
      types: ['string'],
      help: i18n.translate('expressionXY.dataLayer.columnToLabel.help', {
        defaultMessage: 'JSON key-value pairs of column ID to label',
      }),
    },
    palette: {
      types: ['palette', 'system_palette'],
      help: i18n.translate('expressionXY.dataLayer.palette.help', {
        defaultMessage: 'Palette',
      }),
      default: '{palette}',
    },
  },
  fn(table, args) {
    validateMarkSizeForChartType(args.markSizeAccessor, args.seriesType);
    validateAccessor(args.markSizeAccessor, table.columns);
    validateLinesVisibilityForChartType(args.showLines, args.seriesType);
    validateLineWidthForChartType(args.lineWidth, args.seriesType);
    validateShowPointsForChartType(args.showPoints, args.seriesType);
    validatePointsRadiusForChartType(args.pointsRadius, args.seriesType);

    return {
      type: DATA_LAYER,
      ...args,
      accessors: args.accessors ?? [],
      layerType: LayerTypes.DATA,
      table,
    };
  },
};
