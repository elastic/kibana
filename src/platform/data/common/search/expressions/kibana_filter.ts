/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { KibanaFilter } from './kibana_context_type';

interface Arguments {
  query: string;
  negate?: boolean;
  disabled?: boolean;
}

export type ExpressionFunctionKibanaFilter = ExpressionFunctionDefinition<
  'kibanaFilter',
  null,
  Arguments,
  KibanaFilter
>;

export const kibanaFilterFunction: ExpressionFunctionKibanaFilter = {
  name: 'kibanaFilter',
  type: 'kibana_filter',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.kibanaFilter.help', {
    defaultMessage: 'Create kibana filter',
  }),
  args: {
    query: {
      types: ['string'],
      aliases: ['q', '_'],
      required: true,
      help: i18n.translate('data.search.functions.kibanaFilter.field.help', {
        defaultMessage: 'Specify free form esdsl query',
      }),
    },
    negate: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('data.search.functions.kibanaFilter.negate.help', {
        defaultMessage: 'Should the filter be negated',
      }),
    },
    disabled: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('data.search.functions.kibanaFilter.disabled.help', {
        defaultMessage: 'Should the filter be disabled',
      }),
    },
  },

  fn(input, args) {
    return {
      type: 'kibana_filter',
      meta: {
        negate: args.negate || false,
        alias: '',
        disabled: args.disabled || false,
      },
      query: JSON.parse(args.query),
    };
  },
};
