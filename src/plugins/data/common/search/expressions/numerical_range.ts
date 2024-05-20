/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNil, omitBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';

export interface NumericalRange {
  from?: number;
  to?: number;
  label?: string;
}

export type NumericalRangeOutput = ExpressionValueBoxed<'numerical_range', NumericalRange>;

export type ExpressionFunctionNumericalRange = ExpressionFunctionDefinition<
  'numericalRange',
  null,
  NumericalRange,
  NumericalRangeOutput
>;

export const numericalRangeFunction: ExpressionFunctionNumericalRange = {
  name: 'numericalRange',
  type: 'numerical_range',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.numericalRange.help', {
    defaultMessage: 'Create a numerical range',
  }),
  args: {
    from: {
      types: ['number'],
      help: i18n.translate('data.search.functions.numericalRange.from.help', {
        defaultMessage: 'Specify the starting value',
      }),
    },
    to: {
      types: ['number'],
      help: i18n.translate('data.search.functions.numericalRange.to.help', {
        defaultMessage: 'Specify the ending value',
      }),
    },
    label: {
      types: ['string'],
      help: i18n.translate('data.search.functions.numericalRange.label.help', {
        defaultMessage: 'Specify the range label',
      }),
    },
  },

  fn(input, { from, to, label }) {
    return {
      type: 'numerical_range',
      ...omitBy({ from, to, label }, isNil),
    };
  },
};
