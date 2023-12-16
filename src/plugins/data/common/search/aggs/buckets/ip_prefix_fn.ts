/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { AggExpressionType, AggExpressionFunctionArgs, BUCKET_TYPES } from '..';

export const aggIpPrefixFnName = 'aggIpPrefix';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.IP_PREFIX>;

type Arguments = AggArgs;

type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggIpPrefixFnName,
  Input,
  Arguments,
  Output
>;

export const aggIpPrefix = (): FunctionDefinition => ({
  name: aggIpPrefixFnName,
  help: i18n.translate('data.search.aggs.function.buckets.ipPrefix.help', {
    defaultMessage: 'Generates a serialized agg config for a Ip Prefix agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.ipPrefix.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.ipPrefix.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.ipPrefix.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.buckets.ipPrefix.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    prefixLength: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.ipPrefix.prefixLength.help', {
        defaultMessage: 'Length of the network prefix',
      }),
    },
    prefixLength64: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.ipPrefix.prefixLength64.help', {
        defaultMessage: 'Length of the network prefix',
      }),
    },
    isIpv6: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('data.search.aggs.buckets.ipPrefix.isIpv6.help', {
        defaultMessage: 'Defines whether the prefix applies to IPv6 addresses',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.ipPrefix.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.ipPrefix.customLabel.help', {
        defaultMessage: 'Represents a custom label for this aggregation',
      }),
    },
  },
  fn: (input, { id, enabled, schema, ...params }) => {
    return {
      type: 'agg_type',
      value: {
        id,
        enabled,
        schema,
        type: BUCKET_TYPES.IP_PREFIX,
        params: {
          ...params,
        },
      },
    };
  },
});
