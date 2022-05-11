/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';

export interface DateRange {
  from: number | string;
  to: number | string;
}

export type DateRangeOutput = ExpressionValueBoxed<'date_range', DateRange>;

export type ExpressionFunctionDateRange = ExpressionFunctionDefinition<
  'dateRange',
  null,
  DateRange,
  DateRangeOutput
>;

export const dateRangeFunction: ExpressionFunctionDateRange = {
  name: 'dateRange',
  type: 'date_range',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.dateRange.help', {
    defaultMessage: 'Create a date range',
  }),
  args: {
    from: {
      types: ['number', 'string'],
      help: i18n.translate('data.search.functions.dateRange.from.help', {
        defaultMessage: 'Specify the starting date',
      }),
    },
    to: {
      types: ['number', 'string'],
      help: i18n.translate('data.search.functions.dateRange.to.help', {
        defaultMessage: 'Specify the ending date',
      }),
    },
  },

  fn(input, { from, to }) {
    return {
      from,
      to,
      type: 'date_range',
    };
  },
};
