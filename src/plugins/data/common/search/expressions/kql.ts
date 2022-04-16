/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { KibanaQueryOutput } from './kibana_context_type';

interface Arguments {
  q: string;
}

export type ExpressionFunctionKql = ExpressionFunctionDefinition<
  'kql',
  null,
  Arguments,
  KibanaQueryOutput
>;

export const kqlFunction: ExpressionFunctionKql = {
  name: 'kql',
  type: 'kibana_query',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.kql.help', {
    defaultMessage: 'Create kibana kql query',
  }),
  args: {
    q: {
      types: ['string'],
      required: true,
      aliases: ['query', '_'],
      help: i18n.translate('data.search.functions.kql.q.help', {
        defaultMessage: 'Specify Kibana KQL free form text query',
      }),
    },
  },

  fn(input, args) {
    return {
      type: 'kibana_query',
      language: 'kuery',
      query: args.q,
    };
  },
};
