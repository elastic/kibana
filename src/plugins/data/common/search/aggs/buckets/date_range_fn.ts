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

export const aggDateRangeFnName = 'aggDateRange';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.DATE_RANGE>;

type Arguments = Assign<AggArgs, { ranges?: string }>;

type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggDateRangeFnName,
  Input,
  Arguments,
  Output
>;

export const aggDateRange = (): FunctionDefinition => ({
  name: aggDateRangeFnName,
  help: i18n.translate('data.search.aggs.function.buckets.dateRange.help', {
    defaultMessage: 'Generates a serialized agg config for a Date Range agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateRange.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.dateRange.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateRange.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateRange.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    ranges: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateRange.ranges.help', {
        defaultMessage: 'Serialized ranges to use for this aggregation.',
      }),
    },
    time_zone: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateRange.timeZone.help', {
        defaultMessage: 'Time zone to use for this aggregation.',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateRange.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateRange.customLabel.help', {
        defaultMessage: 'Represents a custom label for this aggregation',
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
        type: BUCKET_TYPES.DATE_RANGE,
        params: {
          ...rest,
          ranges: getParsedValue(args, 'ranges'),
        },
      },
    };
  },
});
