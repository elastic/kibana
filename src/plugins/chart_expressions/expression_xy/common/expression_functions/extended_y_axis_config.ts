/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import {
  AvailableReferenceLineIcons,
  EXTENDED_Y_CONFIG,
  FillStyles,
  IconPositions,
  LineStyles,
  YAxisModes,
} from '../constants';
import { ExtendedYConfig, ExtendedYConfigResult } from '../types';

export const extendedYAxisConfigFunction: ExpressionFunctionDefinition<
  typeof EXTENDED_Y_CONFIG,
  null,
  ExtendedYConfig,
  ExtendedYConfigResult
> = {
  name: EXTENDED_Y_CONFIG,
  aliases: [],
  type: EXTENDED_Y_CONFIG,
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
      strict: true,
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
      strict: true,
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
      options: [...Object.values(AvailableReferenceLineIcons)],
      strict: true,
    },
    iconPosition: {
      types: ['string'],
      options: [...Object.values(IconPositions)],
      help: i18n.translate('expressionXY.yConfig.iconPosition.help', {
        defaultMessage: 'The placement of the icon for the reference line',
      }),
      strict: true,
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
      strict: true,
    },
  },
  fn(input, args) {
    return {
      type: EXTENDED_Y_CONFIG,
      ...args,
    };
  },
};
