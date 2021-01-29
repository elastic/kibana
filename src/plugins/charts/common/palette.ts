/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { i18n } from '@kbn/i18n';
import { paletteIds } from './constants';

export interface CustomPaletteArguments {
  color?: string[];
  gradient: boolean;
  reverse?: boolean;
}

export interface CustomPaletteState {
  colors: string[];
  gradient: boolean;
}

export interface SystemPaletteArguments {
  name: string;
}

export interface PaletteOutput<T = unknown> {
  type: 'palette';
  name: string;
  params?: T;
}
export const defaultCustomColors = [
  // This set of defaults originated in Canvas, which, at present, is the primary
  // consumer of this function.  Changing this default requires a change in Canvas
  // logic, which would likely be a breaking change in 7.x.
  '#882E72',
  '#B178A6',
  '#D6C1DE',
  '#1965B0',
  '#5289C7',
  '#7BAFDE',
  '#4EB265',
  '#90C987',
  '#CAE0AB',
  '#F7EE55',
  '#F6C141',
  '#F1932D',
  '#E8601C',
  '#DC050C',
];

export function palette(): ExpressionFunctionDefinition<
  'palette',
  null,
  CustomPaletteArguments,
  PaletteOutput<CustomPaletteState>
> {
  return {
    name: 'palette',
    aliases: [],
    type: 'palette',
    inputTypes: ['null'],
    help: i18n.translate('charts.functions.paletteHelpText', {
      defaultMessage: 'Creates a color palette.',
    }),
    args: {
      color: {
        aliases: ['_'],
        multi: true,
        types: ['string'],
        help: i18n.translate('charts.functions.palette.args.colorHelpText', {
          defaultMessage:
            'The palette colors. Accepts an {html} color name, {hex}, {hsl}, {hsla}, {rgb}, or {rgba}.',
          values: {
            html: 'HTML',
            rgb: 'RGB',
            rgba: 'RGBA',
            hex: 'HEX',
            hsl: 'HSL',
            hsla: 'HSLA',
          },
        }),
        required: false,
      },
      gradient: {
        types: ['boolean'],
        default: false,
        help: i18n.translate('charts.functions.palette.args.gradientHelpText', {
          defaultMessage: 'Make a gradient palette where supported?',
        }),
        options: [true, false],
      },
      reverse: {
        types: ['boolean'],
        default: false,
        help: i18n.translate('charts.functions.palette.args.reverseHelpText', {
          defaultMessage: 'Reverse the palette?',
        }),
        options: [true, false],
      },
    },
    fn: (input, args) => {
      const { color, reverse, gradient } = args;
      const colors = ([] as string[]).concat(color || defaultCustomColors);

      return {
        type: 'palette',
        name: 'custom',
        params: {
          colors: reverse ? colors.reverse() : colors,
          gradient,
        },
      };
    },
  };
}

export function systemPalette(): ExpressionFunctionDefinition<
  'system_palette',
  null,
  SystemPaletteArguments,
  PaletteOutput
> {
  return {
    name: 'system_palette',
    aliases: [],
    type: 'palette',
    inputTypes: ['null'],
    help: i18n.translate('charts.functions.systemPaletteHelpText', {
      defaultMessage: 'Creates a dynamic color palette.',
    }),
    args: {
      name: {
        types: ['string'],
        help: i18n.translate('charts.functions.systemPalette.args.nameHelpText', {
          defaultMessage: 'Name of the palette in the palette list',
        }),
        options: paletteIds,
      },
    },
    fn: (input, args) => {
      return {
        type: 'palette',
        name: args.name,
      };
    },
  };
}
