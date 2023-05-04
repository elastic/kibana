/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNil, omit, omitBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
import { Query } from '../../query';
import { KibanaQueryOutput } from './kibana_context_type';

export interface QueryFilter {
  input: Query;
  label?: string;
}

export type QueryFilterOutput = ExpressionValueBoxed<'kibana_query_filter', QueryFilter>;

interface QueryFilterArguments {
  input: KibanaQueryOutput;
  label?: string;
}

export type ExpressionFunctionQueryFilter = ExpressionFunctionDefinition<
  'queryFilter',
  null,
  QueryFilterArguments,
  QueryFilterOutput
>;

export const queryFilterFunction: ExpressionFunctionQueryFilter = {
  name: 'queryFilter',
  type: 'kibana_query_filter',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.queryFilter.help', {
    defaultMessage: 'Create a query filter',
  }),
  args: {
    input: {
      types: ['kibana_query'],
      aliases: ['_'],
      required: true,
      help: i18n.translate('data.search.functions.queryFilter.input.help', {
        defaultMessage: 'Specify the query filter',
      }),
    },
    label: {
      types: ['string'],
      help: i18n.translate('data.search.functions.queryFilter.label.help', {
        defaultMessage: 'Specify the filter label',
      }),
    },
  },

  fn(_, { input, label }): QueryFilterOutput {
    return {
      type: 'kibana_query_filter',
      input: omit(input, 'type'),
      ...omitBy({ label }, isNil),
    };
  },
};
