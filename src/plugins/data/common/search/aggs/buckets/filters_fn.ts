/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Assign } from '@kbn/utility-types';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { AggExpressionType, AggExpressionFunctionArgs, BUCKET_TYPES } from '../';
import { getParsedValue } from '../utils/get_parsed_value';

export const aggFiltersFnName = 'aggFilters';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.FILTERS>;

type Arguments = Assign<AggArgs, { filters?: string }>;

type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggFiltersFnName,
  Input,
  Arguments,
  Output
>;

export const aggFilters = (): FunctionDefinition => ({
  name: aggFiltersFnName,
  help: i18n.translate('data.search.aggs.function.buckets.filters.help', {
    defaultMessage: 'Generates a serialized agg config for a Filter agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.filters.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.filters.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.filters.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    filters: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.filters.filters.help', {
        defaultMessage: 'Filters to use for this aggregation',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.filters.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
  },
  fn: (input, args) => {
    const { id, enabled, schema, ...rest } = args;

    return {
      type: 'agg_type',
      value: {
        id,
        enabled,
        schema,
        type: BUCKET_TYPES.FILTERS,
        params: {
          ...rest,
          filters: getParsedValue(args, 'filters'),
        },
      },
    };
  },
});
