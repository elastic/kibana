/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Assign } from '@kbn/utility-types';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { AggExpressionType, AggExpressionFunctionArgs, BUCKET_TYPES } from '../';
import { getParsedValue } from '../utils/get_parsed_value';

export const aggIpRangeFnName = 'aggIpRange';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.IP_RANGE>;

type Arguments = Assign<AggArgs, { ranges?: string; ipRangeType?: string }>;

type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggIpRangeFnName,
  Input,
  Arguments,
  Output
>;

export const aggIpRange = (): FunctionDefinition => ({
  name: aggIpRangeFnName,
  help: i18n.translate('data.search.aggs.function.buckets.ipRange.help', {
    defaultMessage: 'Generates a serialized agg config for a Ip Range agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.ipRange.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.ipRange.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.ipRange.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.buckets.ipRange.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    ipRangeType: {
      types: ['string'],
      options: ['mask', 'fromTo'],
      help: i18n.translate('data.search.aggs.buckets.ipRange.ipRangeType.help', {
        defaultMessage:
          'IP range type to use for this aggregation. Takes one of the following values: mask, fromTo.',
      }),
    },
    ranges: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.ipRange.ranges.help', {
        defaultMessage: 'Serialized ranges to use for this aggregation.',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.ipRange.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.ipRange.customLabel.help', {
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
        type: BUCKET_TYPES.IP_RANGE,
        params: {
          ...rest,
          ranges: getParsedValue(args, 'ranges'),
        },
      },
    };
  },
});
