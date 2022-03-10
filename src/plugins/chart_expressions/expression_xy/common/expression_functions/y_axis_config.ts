/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExpressionFunctionDefinition } from '../../../../expressions/common';
import { FillStyles, IconPositions, LineStyles, YAxisModes, Y_CONFIG } from '../constants';
import { YConfig, YConfigResult } from '../types';

export const yAxisConfigFunction: ExpressionFunctionDefinition<
  typeof Y_CONFIG,
  null,
  YConfig,
  YConfigResult
> = {
  name: Y_CONFIG,
  aliases: [],
  type: Y_CONFIG,
  help: `Configure the behavior of a xy chart's y axis metric`,
  inputTypes: ['null'],
  args: {
    forAccessor: {
      types: ['string'],
      help: 'The accessor this configuration is for',
    },
    axisMode: {
      types: ['string'],
      options: [...Object.values(YAxisModes)],
      help: 'The axis mode of the metric',
    },
    color: {
      types: ['string'],
      help: 'The color of the series',
    },
    lineStyle: {
      types: ['string'],
      options: [...Object.values(LineStyles)],
      help: 'The style of the reference line',
    },
    lineWidth: {
      types: ['number'],
      help: 'The width of the reference line',
    },
    icon: {
      types: ['string'],
      help: 'An optional icon used for reference lines',
    },
    iconPosition: {
      types: ['string'],
      options: [...Object.values(IconPositions)],
      help: 'The placement of the icon for the reference line',
    },
    textVisibility: {
      types: ['boolean'],
      help: 'Visibility of the label on the reference line',
    },
    fill: {
      types: ['string'],
      options: [...Object.values(FillStyles)],
      help: '',
    },
  },
  fn(input, args) {
    return {
      type: Y_CONFIG,
      ...args,
    };
  },
};
