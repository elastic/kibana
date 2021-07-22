/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { KibanaField, KibanaFilter } from './kibana_context_type';
import { buildFilter, FILTERS } from '../../es_query/filters';
import { IndexPattern } from '../../index_patterns/index_patterns';
import { KibanaRange } from './range';

interface Arguments {
  field: KibanaField;
  range: KibanaRange;
  negate?: boolean;
}

export type ExpressionFunctionRangeFilter = ExpressionFunctionDefinition<
  'rangeFilter',
  null,
  Arguments,
  KibanaFilter
>;

export const rangeFilterFunction: ExpressionFunctionRangeFilter = {
  name: 'rangeFilter',
  type: 'kibana_filter',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.rangeFilter.help', {
    defaultMessage: 'Create kibana range filter',
  }),
  args: {
    field: {
      types: ['kibana_field'],
      required: true,
      help: i18n.translate('data.search.functions.rangeFilter.field.help', {
        defaultMessage: 'Specify the field you want to filter on. Use `field` function.',
      }),
    },
    range: {
      types: ['kibana_range'],
      required: true,
      help: i18n.translate('data.search.functions.rangeFilter.range.help', {
        defaultMessage: 'Specify the range, use `range` function.',
      }),
    },
    negate: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('data.search.functions.rangeFilter.negate.help', {
        defaultMessage: 'Should the filter be negated',
      }),
    },
  },

  fn(input, args) {
    return {
      type: 'kibana_filter',
      ...buildFilter(
        ({} as any) as IndexPattern,
        args.field.spec,
        FILTERS.RANGE,
        args.negate || false,
        false,
        { from: args.range.gt || args.range.gte, to: args.range.lt || args.range.lte },
        null
      ),
    };
  },
};
