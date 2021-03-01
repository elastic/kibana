/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExpressionValueBoxed } from 'src/plugins/expressions/common';
import { TimeRange } from '../../query';

export type KibanaTimerangeOutput = ExpressionValueBoxed<'timerange', TimeRange>;

export type ExpressionFunctionKibanaTimerange = ExpressionFunctionDefinition<
  'timerange',
  null,
  TimeRange,
  KibanaTimerangeOutput
>;

export const kibanaTimerangeFunction: ExpressionFunctionKibanaTimerange = {
  name: 'timerange',
  type: 'timerange',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.timerange.help', {
    defaultMessage: 'Create kibana query',
  }),
  args: {
    from: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.functions.timerange.from.help', {
        defaultMessage: 'Specify Kibana free form text query',
      }),
    },
    to: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.functions.timerange.to.help', {
        defaultMessage: 'Specify the type of the query (kql or lucene)',
      }),
    },
    mode: {
      types: ['string'],
      help: i18n.translate('data.search.functions.timerange.mode.help', {
        defaultMessage: 'Specify the type of the query (kql or lucene)',
      }),
    },
  },

  fn(input, args) {
    return {
      type: 'timerange',
      from: args.from,
      to: args.to,
      mode: args.mode,
    };
  },
};
