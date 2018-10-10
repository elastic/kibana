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

import inlineStyle from 'inline-style';
import { openSans } from '@kbn/interpreter/common/lib/fonts';

export const font = () => ({
  name: 'font',
  aliases: [],
  type: 'style',
  help: 'Create a font style',
  context: {
    types: ['null'],
  },
  args: {
    size: {
      types: ['number'],
      help: 'Font size (px)',
      default: 14,
    },
    lHeight: {
      types: ['number'],
      aliases: ['lineHeight'],
      help: 'Line height (px)',
    },
    family: {
      types: ['string'],
      default: `"${openSans.value}"`,
      help: 'An acceptable CSS web font string',
    },
    color: {
      types: ['string', 'null'],
      help: 'Text color',
    },
    weight: {
      types: ['string'],
      help:
        'Set the font weight, e.g. normal, bold, bolder, lighter, 100, 200, 300, 400, 500, 600, 700, 800, 900',
      default: 'normal',
    },
    underline: {
      types: ['boolean'],
      default: false,
      help: 'Underline the text, true or false',
    },
    italic: {
      types: ['boolean'],
      default: false,
      help: 'Italicize, true or false',
    },
    align: {
      types: ['string'],
      help: 'Horizontal text alignment',
      default: 'left',
    },
  },
  fn: (context, args) => {
    const weights = [
      'normal',
      'bold',
      'bolder',
      'lighter',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
    ];
    const alignments = ['center', 'left', 'right', 'justified'];

    if (!weights.includes(args.weight)) throw new Error(`Invalid font weight: ${args.weight}`);
    if (!alignments.includes(args.align)) throw new Error(`Invalid text alignment: ${args.align}`);

    // the line height shouldn't ever be lower than the size
    const lineHeight = args.lHeight ? `${args.lHeight}px` : 1;

    const spec = {
      fontFamily: args.family,
      fontWeight: args.weight,
      fontStyle: args.italic ? 'italic' : 'normal',
      textDecoration: args.underline ? 'underline' : 'none',
      textAlign: args.align,
      fontSize: `${args.size}px`, // apply font size as a pixel setting
      lineHeight: lineHeight, // apply line height as a pixel setting
    };

    // conditionally apply styles based on input
    if (args.color) spec.color = args.color;

    return {
      type: 'style',
      spec,
      css: inlineStyle(spec),
    };
  },
});
