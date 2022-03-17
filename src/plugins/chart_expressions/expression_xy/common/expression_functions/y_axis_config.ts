/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
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
  help: i18n.translate('expressionXY.yConfig.help', {
    defaultMessage: `Configure the behavior of a xy chart's y axis metric`,
  }),
  inputTypes: ['null'],
  args: {
    forAccessor: {
      types: ['string'],
      help: i18n.translate('expressionXY.yConfig.forAccessor.help', {
        defaultMessage: 'The accessor this configuration is for',
      }),
    },
    axisMode: {
      types: ['string'],
      options: [...Object.values(YAxisModes)],
      help: i18n.translate('expressionXY.yConfig.axisMode.help', {
        defaultMessage: 'The axis mode of the metric',
      }),
    },
    color: {
      types: ['string'],
      help: i18n.translate('expressionXY.yConfig.color.help', {
        defaultMessage: 'The color of the series',
      }),
    },
    lineStyle: {
      types: ['string'],
      options: [...Object.values(LineStyles)],
      help: i18n.translate('expressionXY.yConfig.lineStyle.help', {
        defaultMessage: 'The style of the reference line',
      }),
    },
    lineWidth: {
      types: ['number'],
      help: i18n.translate('expressionXY.yConfig.lineWidth.help', {
        defaultMessage: 'The width of the reference line',
      }),
    },
    icon: {
      types: ['string'],
      help: i18n.translate('expressionXY.yConfig.icon.help', {
        defaultMessage: 'An optional icon used for reference lines',
      }),
    },
    iconPosition: {
      types: ['string'],
      options: [...Object.values(IconPositions)],
      help: i18n.translate('expressionXY.yConfig.iconPosition.help', {
        defaultMessage: 'The placement of the icon for the reference line',
      }),
    },
    textVisibility: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.yConfig.textVisibility.help', {
        defaultMessage: 'Visibility of the label on the reference line',
      }),
    },
    fill: {
      types: ['string'],
      options: [...Object.values(FillStyles)],
      help: i18n.translate('expressionXY.yConfig.fill.help', {
        defaultMessage: 'Fill',
      }),
    },
  },
  fn(input, args) {
    return {
      type: Y_CONFIG,
      ...args,
    };
  },
};
