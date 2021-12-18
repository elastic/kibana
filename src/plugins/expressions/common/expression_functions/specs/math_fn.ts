/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map, zipObject, isString } from 'lodash';
import { i18n } from '@kbn/i18n';
import { evaluate } from '@kbn/tinymath';
import { isDatatable } from '../../expression_types';
import { MathArguments, MathInput } from './math';

function pivotObjectArray<
  RowType extends { [key: string]: unknown },
  ReturnColumns extends keyof RowType & string
>(rows: RowType[], columns?: ReturnColumns[]) {
  const columnNames = columns || Object.keys(rows[0]);
  if (!columnNames.every(isString)) {
    throw new Error('Columns should be an array of strings');
  }

  const columnValues = map(columnNames, (name) => map(rows, name));

  return zipObject(columnNames, columnValues) as { [K in ReturnColumns]: Array<RowType[K]> };
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

export const mathFn = (input: MathInput, args: MathArguments): boolean | number | null => {
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
};
