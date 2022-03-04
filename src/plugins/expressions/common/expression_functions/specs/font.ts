/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';
import { openSans, FontLabel as FontFamily } from '../../fonts';
import {
  CSSStyle,
  FontSizeUnit,
  FontStyle,
  FontWeight,
  Style,
  TextAlignment,
  TextDecoration,
} from '../../types';

const dashify = (str: string) => {
  return str
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\W/g, (m) => (/[À-ž]/.test(m) ? m : '-'))
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
};

const inlineStyle = (obj: Record<string, string | number>) => {
  if (!obj) return '';
  const styles = Object.keys(obj).map((key) => {
    const prop = dashify(key);
    const line = prop.concat(':').concat(String(obj[key]));
    return line;
  });
  return styles.join(';');
};

export interface FontArguments {
  align?: TextAlignment;
  color?: string;
  family?: FontFamily;
  italic?: boolean;
  lHeight?: number | null;
  size?: number;
  underline?: boolean;
  weight?: FontWeight;
  sizeUnit?: string;
}

export type ExpressionFunctionFont = ExpressionFunctionDefinition<
  'font',
  null,
  FontArguments,
  Style
>;

export const font: ExpressionFunctionFont = {
  name: 'font',
  aliases: [],
  type: 'style',
  help: i18n.translate('expressions.functions.fontHelpText', {
    defaultMessage: 'Create a font style.',
  }),
  inputTypes: ['null'],
  args: {
    align: {
      default: '{ theme "font.align" default="left" }',
      help: i18n.translate('expressions.functions.font.args.alignHelpText', {
        defaultMessage: 'The horizontal text alignment.',
      }),
      options: Object.values(TextAlignment),
      types: ['string'],
    },
    color: {
      default: `{ theme "font.color" }`,
      help: i18n.translate('expressions.functions.font.args.colorHelpText', {
        defaultMessage: 'The text color.',
      }),
      types: ['string'],
    },
    family: {
      default: `{ theme "font.family" default="${openSans.value}" }`,
      help: i18n.translate('expressions.functions.font.args.familyHelpText', {
        defaultMessage: 'An acceptable {css} web font string',
        values: {
          css: 'CSS',
        },
      }),
      types: ['string'],
    },
    italic: {
      default: `{ theme "font.italic" default=false }`,
      help: i18n.translate('expressions.functions.font.args.italicHelpText', {
        defaultMessage: 'Italicize the text?',
      }),
      options: [true, false],
      types: ['boolean'],
    },
    lHeight: {
      default: `{ theme "font.lHeight" }`,
      aliases: ['lineHeight'],
      help: i18n.translate('expressions.functions.font.args.lHeightHelpText', {
        defaultMessage: 'The line height in pixels',
      }),
      types: ['number', 'null'],
    },
    size: {
      default: `{ theme "font.size" default=14 }`,
      help: i18n.translate('expressions.functions.font.args.sizeHelpText', {
        defaultMessage: 'The font size',
      }),
      types: ['number'],
    },
    sizeUnit: {
      default: `px`,
      help: i18n.translate('expressions.functions.font.args.sizeUnitHelpText', {
        defaultMessage: 'The font size unit',
      }),
      types: ['string'],
      options: ['px', 'pt'],
    },
    underline: {
      default: `{ theme "font.underline" default=false }`,
      help: i18n.translate('expressions.functions.font.args.underlineHelpText', {
        defaultMessage: 'Underline the text?',
      }),
      options: [true, false],
      types: ['boolean'],
    },
    weight: {
      default: `{ theme "font.weight" default="normal" }`,
      help: i18n.translate('expressions.functions.font.args.weightHelpText', {
        defaultMessage: 'The font weight. For example, {list}, or {end}.',
        values: {
          list: Object.values(FontWeight)
            .slice(0, -1)
            .map((weight) => `\`"${weight}"\``)
            .join(', '),
          end: `\`"${Object.values(FontWeight).slice(-1)[0]}"\``,
        },
      }),
      options: Object.values(FontWeight),
      types: ['string'],
    },
  },
  fn: (input, args) => {
    if (!Object.values(FontWeight).includes(args.weight!)) {
      throw new Error(
        i18n.translate('expressions.functions.font.invalidFontWeightErrorMessage', {
          defaultMessage: "Invalid font weight: '{weight}'",
          values: {
            weight: args.weight,
          },
        })
      );
    }
    if (!Object.values(TextAlignment).includes(args.align!)) {
      throw new Error(
        i18n.translate('expressions.functions.font.invalidTextAlignmentErrorMessage', {
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

    const availableSizeUnits: string[] = [FontSizeUnit.PX, FontSizeUnit.PT];
    if (args.sizeUnit && !availableSizeUnits.includes(args.sizeUnit)) {
      throw new Error(
        i18n.translate('expressions.functions.font.invalidSizeUnitErrorMessage', {
          defaultMessage: "Invalid size unit: '{sizeUnit}'",
          values: {
            sizeUnit: args.sizeUnit,
          },
        })
      );
    }

    const spec: CSSStyle = {
      fontFamily: args.family,
      fontWeight: args.weight,
      fontStyle: args.italic ? FontStyle.ITALIC : FontStyle.NORMAL,
      textDecoration: args.underline ? TextDecoration.UNDERLINE : TextDecoration.NONE,
      textAlign: args.align,
      fontSize: `${args.size}${args.sizeUnit}`,
      lineHeight, // apply line height as a pixel setting
    };

    // conditionally apply styles based on input
    if (args.color) {
      spec.color = args.color;
    }

    return {
      type: 'style',
      spec,
      css: inlineStyle(spec as Record<string, string | number>),
    };
  },
};
