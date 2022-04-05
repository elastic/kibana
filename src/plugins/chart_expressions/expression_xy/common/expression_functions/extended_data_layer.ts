/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Datatable, ExpressionFunctionDefinition } from '../../../../expressions/common';
import { ExtendedDataLayerArgs, ExtendedDataLayerConfigResult } from '../types';
import {
  EXTENDED_DATA_LAYER,
  LayerTypes,
  SeriesTypes,
  XScaleTypes,
  YScaleTypes,
  Y_CONFIG,
} from '../constants';

export const extendedDataLayerFunction: ExpressionFunctionDefinition<
  typeof EXTENDED_DATA_LAYER,
  Datatable,
  ExtendedDataLayerArgs,
  ExtendedDataLayerConfigResult
> = {
  name: EXTENDED_DATA_LAYER,
  aliases: [],
  type: EXTENDED_DATA_LAYER,
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
    },
    xScaleType: {
      options: [...Object.values(XScaleTypes)],
      help: i18n.translate('expressionXY.dataLayer.xScaleType.help', {
        defaultMessage: 'The scale type of the x axis',
      }),
      default: XScaleTypes.ORDINAL,
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
    },
    splitAccessor: {
      types: ['string'],
      help: i18n.translate('expressionXY.dataLayer.splitAccessor.help', {
        defaultMessage: 'The column to split by',
      }),
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
      default: `{theme "palette" default={system_palette name="default"} }`,
      help: i18n.translate('expressionXY.dataLayer.palette.help', {
        defaultMessage: 'Palette',
      }),
      types: ['palette'],
    },
    table: {
      types: ['datatable'],
      help: i18n.translate('expressionXY.dataLayer.table.help', {
        defaultMessage: 'Table',
      }),
    },
  },
  fn(input, args) {
    return {
      type: EXTENDED_DATA_LAYER,
      ...args,
      accessors: args.accessors ?? [],
      layerType: LayerTypes.DATA,
      table: args.table ?? input,
    };
  },
};
