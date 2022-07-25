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

export type ExpressionFunctionLucene = ExpressionFunctionDefinition<
  'lucene',
  null,
  Arguments,
  KibanaQueryOutput
>;

export const luceneFunction: ExpressionFunctionLucene = {
  name: 'lucene',
  type: 'kibana_query',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.lucene.help', {
    defaultMessage: 'Create kibana lucene query',
  }),
  args: {
    q: {
      types: ['string'],
      required: true,
      aliases: ['query', '_'],
      help: i18n.translate('data.search.functions.lucene.q.help', {
        defaultMessage: 'Specify Lucene free form text query',
      }),
    },
  },

  fn(input, args) {
    return {
      type: 'kibana_query',
      language: 'lucene',
      query: JSON.parse(args.q),
    };
  },
};
