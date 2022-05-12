/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  AvailableReferenceLineIcons,
  EXTENDED_Y_CONFIG,
  FillStyles,
  IconPositions,
  LineStyles,
} from '../constants';
import { strings } from '../i18n';
import { ExtendedYConfigFn } from '../types';
import { commonYConfigArgs } from './common_y_config_args';

export const extendedYAxisConfigFunction: ExtendedYConfigFn = {
  name: EXTENDED_Y_CONFIG,
  aliases: [],
  type: EXTENDED_Y_CONFIG,
  help: strings.getYConfigFnHelp(),
  inputTypes: ['null'],
  args: {
    ...commonYConfigArgs,
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
