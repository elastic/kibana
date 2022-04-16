/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Datatable, Range } from '@kbn/expressions-plugin/common';

interface Arguments {
  from: number;
  to: number;
}

export const range = (): ExpressionFunctionDefinition<
  'range',
  Datatable | null,
  Arguments,
  Range
> => ({
  name: 'range',
  help: i18n.translate('visualizations.function.range.help', {
    defaultMessage: 'Generates range object',
  }),
  type: 'range',
  args: {
    from: {
      types: ['number'],
      help: i18n.translate('visualizations.function.range.from.help', {
        defaultMessage: 'Start of range',
      }),
      required: true,
    },
    to: {
      types: ['number'],
      help: i18n.translate('visualizations.function.range.to.help', {
        defaultMessage: 'End of range',
      }),
      required: true,
    },
  },
  fn: (context, args) => {
    return {
      type: 'range',
      from: args.from,
      to: args.to,
    };
  },
});
