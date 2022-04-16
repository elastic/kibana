/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { buildFilter, FILTERS } from '@kbn/es-query';
import { KibanaField, KibanaFilter } from './kibana_context_type';
import { IndexPattern } from '../..';

interface Arguments {
  field: KibanaField;
  negate?: boolean;
}

export type ExpressionFunctionExistsFilter = ExpressionFunctionDefinition<
  'existsFilter',
  null,
  Arguments,
  KibanaFilter
>;

export const existsFilterFunction: ExpressionFunctionExistsFilter = {
  name: 'existsFilter',
  type: 'kibana_filter',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.existsFilter.help', {
    defaultMessage: 'Create kibana exists filter',
  }),
  args: {
    field: {
      types: ['kibana_field'],
      required: true,
      help: i18n.translate('data.search.functions.existsFilter.field.help', {
        defaultMessage: 'Specify the field you want to filter on. Use `field` function.',
      }),
    },
    negate: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('data.search.functions.existsFilter.negate.help', {
        defaultMessage: 'Should the filter be negated.',
      }),
    },
  },

  fn(input, args) {
    return {
      type: 'kibana_filter',
      ...buildFilter(
        {} as any as IndexPattern,
        args.field.spec,
        FILTERS.EXISTS,
        args.negate || false,
        false,
        {},
        null
      ),
    };
  },
};
