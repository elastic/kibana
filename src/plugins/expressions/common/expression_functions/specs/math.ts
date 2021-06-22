/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map, zipObject } from 'lodash';
import { i18n } from '@kbn/i18n';
import { evaluate } from '@kbn/tinymath';
import { ExpressionFunctionDefinition } from '../types';
import { Datatable, isDatatable } from '../../expression_types';

export type MathArguments = {
  expression: string;
  onError?: 'null' | 'zero' | 'false' | 'throw';
};

export type MathInput = number | Datatable;

const TINYMATH = '`TinyMath`';
const TINYMATH_URL =
  'https://www.elastic.co/guide/en/kibana/current/canvas-tinymath-functions.html';

const isString = (val: any): boolean => typeof val === 'string';

function pivotObjectArray<
  RowType extends { [key: string]: any },
  ReturnColumns extends string | number | symbol = keyof RowType
>(rows: RowType[], columns?: string[]): Record<string, ReturnColumns[]> {
  const columnNames = columns || Object.keys(rows[0]);
  if (!columnNames.every(isString)) {
    throw new Error('Columns should be an array of strings');
  }

  const columnValues = map(columnNames, (name) => map(rows, name));
  return zipObject(columnNames, columnValues);
}

export const errors = {
  emptyExpression: () =>
    new Error(
      i18n.translate('expressions.functions.math.emptyExpressionErrorMessage', {
        defaultMessage: 'Empty expression',
      })
    ),
  tooManyResults: () =>
    new Error(
      i18n.translate('expressions.functions.math.tooManyResultsErrorMessage', {
        defaultMessage:
          'Expressions must return a single number. Try wrapping your expression in {mean} or {sum}',
        values: {
          mean: 'mean()',
          sum: 'sum()',
        },
      })
    ),
  executionFailed: () =>
    new Error(
      i18n.translate('expressions.functions.math.executionFailedErrorMessage', {
        defaultMessage: 'Failed to execute math expression. Check your column names',
      })
    ),
  emptyDatatable: () =>
    new Error(
      i18n.translate('expressions.functions.math.emptyDatatableErrorMessage', {
        defaultMessage: 'Empty datatable',
      })
    ),
};

const fallbackValue = {
  null: null,
  zero: 0,
  false: false,
} as const;

export const math: ExpressionFunctionDefinition<
  'math',
  MathInput,
  MathArguments,
  boolean | number | null
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
  fn: (input, args) => {
    const { expression, onError } = args;
    const onErrorValue = onError ?? 'throw';

    if (!expression || expression.trim() === '') {
      throw errors.emptyExpression();
    }

    // Use unique ID if available, otherwise fall back to names
    const mathContext = isDatatable(input)
      ? pivotObjectArray(
          input.rows,
          input.columns.map((col) => col.id)
        )
      : { value: input };

    try {
      const result = evaluate(expression, mathContext);
      if (Array.isArray(result)) {
        if (result.length === 1) {
          return result[0];
        }
        throw errors.tooManyResults();
      }
      if (isNaN(result)) {
        // make TS happy
        if (onErrorValue !== 'throw' && onErrorValue in fallbackValue) {
          return fallbackValue[onErrorValue];
        }
        throw errors.executionFailed();
      }
      return result;
    } catch (e) {
      if (onErrorValue !== 'throw' && onErrorValue in fallbackValue) {
        return fallbackValue[onErrorValue];
      }
      if (isDatatable(input) && input.rows.length === 0) {
        throw errors.emptyDatatable();
      } else {
        throw e;
      }
    }
  },
};
