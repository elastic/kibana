/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExpressionValueBoxed } from 'src/plugins/expressions/common';

interface Arguments {
  gt?: number | string;
  lt?: number | string;
  gte?: number | string;
  lte?: number | string;
}

export type KibanaRange = ExpressionValueBoxed<'kibana_range', Arguments>;

export type ExpressionFunctionRange = ExpressionFunctionDefinition<
  'range',
  null,
  Arguments,
  KibanaRange
>;

export const rangeFunction: ExpressionFunctionRange = {
  name: 'range',
  type: 'kibana_range',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.range.help', {
    defaultMessage: 'Create kibana range filter',
  }),
  args: {
    gt: {
      types: ['string', 'number'],
      help: i18n.translate('data.search.functions.range.gt.help', {
        defaultMessage: 'Greater than',
      }),
    },
    lt: {
      types: ['string', 'number'],
      help: i18n.translate('data.search.functions.range.lt.help', {
        defaultMessage: 'Less than',
      }),
    },
    gte: {
      types: ['string', 'number'],
      help: i18n.translate('data.search.functions.range.gte.help', {
        defaultMessage: 'Greater or equal than',
      }),
    },
    lte: {
      types: ['string', 'number'],
      help: i18n.translate('data.search.functions.range.lte.help', {
        defaultMessage: 'Less or equal than',
      }),
    },
  },

  fn(input, args) {
    if (!args.lt && !args.lte) {
      throw new Error('lt or lte must be provided');
    }

    if (!args.gt && !args.gte) {
      throw new Error('lt or lte must be provided');
    }

    return {
      type: 'kibana_range',
      ...args,
    };
  },
};
