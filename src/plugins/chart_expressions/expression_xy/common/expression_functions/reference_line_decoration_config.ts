/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import {
  AvailableReferenceLineIcons,
  REFERENCE_LINE_DECORATION_CONFIG,
  FillStyles,
  IconPositions,
  LineStyles,
} from '../constants';
import { strings } from '../i18n';
import { ReferenceLineDecorationConfigFn } from '../types';
import { commonDecorationConfigArgs } from './common_y_config_args';

export const referenceLineDecorationConfigFunction: ReferenceLineDecorationConfigFn = {
  name: REFERENCE_LINE_DECORATION_CONFIG,
  aliases: [],
  type: REFERENCE_LINE_DECORATION_CONFIG,
  help: strings.getDecorationsHelp(),
  inputTypes: ['null'],
  args: {
    ...commonDecorationConfigArgs,
    position: {
      types: ['string'],
      options: [Position.Right, Position.Left, Position.Bottom],
      help: i18n.translate('expressionXY.referenceLine.position.help', {
        defaultMessage:
          'Position of axis (first axis of that position) to which the reference line belongs.',
      }),
      default: Position.Left,
      strict: true,
    },
    lineStyle: {
      types: ['string'],
      options: [...Object.values(LineStyles)],
      help: i18n.translate('expressionXY.decorationConfig.lineStyle.help', {
        defaultMessage: 'The style of the reference line',
      }),
      strict: true,
    },
    lineWidth: {
      types: ['number'],
      help: i18n.translate('expressionXY.decorationConfig.lineWidth.help', {
        defaultMessage: 'The width of the reference line',
      }),
    },
    icon: {
      types: ['string'],
      help: i18n.translate('expressionXY.decorationConfig.icon.help', {
        defaultMessage: 'An optional icon used for reference lines',
      }),
      options: [...Object.values(AvailableReferenceLineIcons)],
      strict: true,
    },
    iconPosition: {
      types: ['string'],
      options: [...Object.values(IconPositions)],
      help: i18n.translate('expressionXY.decorationConfig.iconPosition.help', {
        defaultMessage: 'The placement of the icon for the reference line',
      }),
      strict: true,
    },
    textVisibility: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.decorationConfig.textVisibility.help', {
        defaultMessage: 'Visibility of the label on the reference line',
      }),
    },
    fill: {
      types: ['string'],
      options: [...Object.values(FillStyles)],
      help: i18n.translate('expressionXY.decorationConfig.fill.help', {
        defaultMessage: 'Fill',
      }),
      strict: true,
    },
  },
  fn(input, args) {
    return {
      type: REFERENCE_LINE_DECORATION_CONFIG,
      ...args,
    };
  },
};
