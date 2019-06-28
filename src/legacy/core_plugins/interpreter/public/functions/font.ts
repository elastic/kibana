/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// @ts-ignore no @typed def
import inlineStyle from 'inline-style';
import { i18n } from '@kbn/i18n';
import { openSans } from '../../common/lib/fonts';
import { ExpressionFunction } from '../../types';
import {
  CSSStyle,
  FontFamily,
  FontStyle,
  FontWeight,
  Style,
  TextAlignment,
  TextDecoration,
} from '../types';

interface Arguments {
  align: TextAlignment;
  color: string;
  family: FontFamily;
  italic: boolean;
  lHeight: number | null;
  size: number;
  underline: boolean;
  weight: FontWeight;
}

export function font(): ExpressionFunction<'font', null, Arguments, Style> {
  return {
    name: 'font',
    aliases: [],
    type: 'style',
    help: i18n.translate('interpreter.functions.fontHelpText', {
      defaultMessage: 'Create a font style',
    }),
    context: {
      types: ['null'],
    },
    args: {
      align: {
        default: 'left',
        help: i18n.translate('interpreter.functions.font.args.alignHelpText', {
          defaultMessage: 'Horizontal text alignment',
        }),
        options: Object.values(TextAlignment),
        types: ['string'],
      },
      color: {
        help: i18n.translate('interpreter.functions.font.args.colorHelpText', {
          defaultMessage: 'Text color',
        }),
        types: ['string'],
      },
      family: {
        default: `"${openSans.value}"`,
        help: i18n.translate('interpreter.functions.font.args.familyHelpText', {
          defaultMessage: 'An acceptable {css} web font string',
          values: {
            css: 'CSS',
          },
        }),
        types: ['string'],
      },
      italic: {
        default: false,
        help: i18n.translate('interpreter.functions.font.args.italicHelpText', {
          defaultMessage: 'Italicize, true or false',
        }),
        options: [true, false],
        types: ['boolean'],
      },
      lHeight: {
        aliases: ['lineHeight'],
        help: i18n.translate('interpreter.functions.font.args.lHeightHelpText', {
          defaultMessage: 'Line height ({px})',
          values: {
            px: 'px',
          },
        }),
        types: ['number', 'null'],
      },
      size: {
        default: 14,
        help: i18n.translate('interpreter.functions.font.args.sizeHelpText', {
          defaultMessage: 'Font size ({px})',
          values: {
            px: 'px',
          },
        }),
        types: ['number'],
      },
      underline: {
        default: false,
        help: i18n.translate('interpreter.functions.font.args.underlineHelpText', {
          defaultMessage: 'Underline the text, true or false',
        }),
        options: [true, false],
        types: ['boolean'],
      },
      weight: {
        default: 'normal',
        help: i18n.translate('interpreter.functions.font.args.weightHelpText', {
          defaultMessage: 'Set the font weight, e.g. {examples}',
          values: {
            examples: Object.values(FontWeight).join(', '),
          },
        }),
        options: Object.values(FontWeight),
        types: ['string'],
      },
    },
    fn: (_context, args) => {
      if (!Object.values(FontWeight).includes(args.weight)) {
        throw new Error(
          i18n.translate('interpreter.functions.font.invalidFontWeightErrorMessage', {
            defaultMessage: "Invalid font weight: '{weight}'",
            values: {
              weight: args.weight,
            },
          })
        );
      }
      if (!Object.values(TextAlignment).includes(args.align)) {
        throw new Error(
          i18n.translate('interpreter.functions.font.invalidTextAlignmentErrorMessage', {
            defaultMessage: "Invalid text alignment: '{align}'",
            values: {
              align: args.align,
            },
          })
        );
      }

      // the line height shouldn't ever be lower than the size, and apply as a
      // pixel setting
      const lineHeight = args.lHeight != null ? `${args.lHeight}px` : '1';

      const spec: CSSStyle = {
        fontFamily: args.family,
        fontWeight: args.weight,
        fontStyle: args.italic ? FontStyle.ITALIC : FontStyle.NORMAL,
        textDecoration: args.underline ? TextDecoration.UNDERLINE : TextDecoration.NONE,
        textAlign: args.align,
        fontSize: `${args.size}px`, // apply font size as a pixel setting
        lineHeight, // apply line height as a pixel setting
      };

      // conditionally apply styles based on input
      if (args.color) {
        spec.color = args.color;
      }

      return {
        type: 'style',
        spec,
        css: inlineStyle(spec),
      };
    },
  };
}
