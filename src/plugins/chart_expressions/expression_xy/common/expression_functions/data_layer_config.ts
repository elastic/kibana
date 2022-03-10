/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import { DataLayerArgs, DataLayerConfigResult } from '../types';
import {
  DATA_LAYER,
  LayerTypes,
  SeriesTypes,
  XScaleTypes,
  YScaleTypes,
  Y_CONFIG,
} from '../constants';

export const dataLayerConfigFunction: ExpressionFunctionDefinition<
  typeof DATA_LAYER,
  null,
  DataLayerArgs,
  DataLayerConfigResult
> = {
  name: DATA_LAYER,
  aliases: [],
  type: DATA_LAYER,
  help: `Configure a layer in the xy chart`,
  inputTypes: ['null'],
  args: {
    hide: {
      types: ['boolean'],
      default: false,
      help: 'Show / hide axis',
    },
    layerId: {
      types: ['string'],
      help: '',
    },
    xAccessor: {
      types: ['string'],
      help: '',
    },
    seriesType: {
      types: ['string'],
      options: [...Object.values(SeriesTypes)],
      help: 'The type of chart to display.',
    },
    xScaleType: {
      options: [...Object.values(XScaleTypes)],
      help: 'The scale type of the x axis',
      default: XScaleTypes.ORDINAL,
    },
    isHistogram: {
      types: ['boolean'],
      default: false,
      help: 'Whether to layout the chart as a histogram',
    },
    yScaleType: {
      options: [...Object.values(YScaleTypes)],
      help: 'The scale type of the y axes',
      default: YScaleTypes.LINEAR,
    },
    splitAccessor: {
      types: ['string'],
      help: 'The column to split by',
      multi: false,
    },
    accessors: {
      types: ['string'],
      help: 'The columns to display on the y axis.',
      multi: true,
    },
    yConfig: {
      types: [Y_CONFIG],
      help: 'Additional configuration for y axes',
      multi: true,
    },
    columnToLabel: {
      types: ['string'],
      help: 'JSON key-value pairs of column ID to label',
    },
    palette: {
      default: `{theme "palette" default={system_palette name="default"} }`,
      help: '',
      types: ['palette'],
    },
  },
  fn(input, args) {
    return {
      type: DATA_LAYER,
      ...args,
      layerType: LayerTypes.DATA,
    };
  },
};
