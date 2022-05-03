/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { PaletteExpressionFunctionDefinition } from './types';

export function palette(): PaletteExpressionFunctionDefinition {
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
      stop: {
        multi: true,
        types: ['number'],
        help: i18n.translate('charts.functions.palette.args.stopHelpText', {
          defaultMessage:
            'The palette color stops. When used, it must be associated with each color.',
        }),
        required: false,
      },
      continuity: {
        types: ['string'],
        options: ['above', 'below', 'all', 'none'],
        default: 'above',
        help: '',
      },
      rangeMin: {
        types: ['number'],
        help: '',
      },
      rangeMax: {
        types: ['number'],
        help: '',
      },
      range: {
        types: ['string'],
        options: ['number', 'percent'],
        default: 'percent',
        help: '',
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
    async fn(...args) {
      /** Build optimization: prevent adding extra code into initial bundle **/
      const { paletteExpressionFn } = await import('./palette_fn');
      return paletteExpressionFn(...args);
    },
  };
}
