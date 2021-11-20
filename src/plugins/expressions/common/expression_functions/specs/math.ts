/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';
import { Datatable } from '../../expression_types';

export type MathArguments = {
  expression: string;
  onError?: 'null' | 'zero' | 'false' | 'throw';
};

export type MathInput = number | Datatable;

const TINYMATH = '`TinyMath`';
const TINYMATH_URL =
  'https://www.elastic.co/guide/en/kibana/current/canvas-tinymath-functions.html';

export const math: ExpressionFunctionDefinition<
  'math',
  MathInput,
  MathArguments,
  Promise<boolean | number | null>
> = {
  name: 'math',
  type: undefined,
  inputTypes: ['number', 'datatable'],
  help: i18n.translate('expressions.functions.mathHelpText', {
    defaultMessage:
      'Interprets a {TINYMATH} math expression using a {TYPE_NUMBER} or {DATATABLE} as {CONTEXT}. ' +
      'The {DATATABLE} columns are available by their column name. ' +
      'If the {CONTEXT} is a number it is available as {value}.',
    values: {
      TINYMATH,
      CONTEXT: '_context_',
      DATATABLE: '`datatable`',
      value: '`value`',
      TYPE_NUMBER: '`number`',
    },
  }),
  args: {
    expression: {
      aliases: ['_'],
      types: ['string'],
      help: i18n.translate('expressions.functions.math.args.expressionHelpText', {
        defaultMessage: 'An evaluated {TINYMATH} expression. See {TINYMATH_URL}.',
        values: {
          TINYMATH,
          TINYMATH_URL,
        },
      }),
    },
    onError: {
      types: ['string'],
      options: ['throw', 'false', 'zero', 'null'],
      help: i18n.translate('expressions.functions.math.args.onErrorHelpText', {
        defaultMessage:
          "In case the {TINYMATH} evaluation fails or returns NaN, the return value is specified by onError. When `'throw'`, it will throw an exception, terminating expression execution (default).",
        values: {
          TINYMATH,
        },
      }),
    },
  },
  fn: async (input, args) => {
    const { mathFn } = await import('./math_fn');
    return mathFn(input, args);
  },
};
