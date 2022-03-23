/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { AggExpressionFunctionArgs, AggExpressionType, BUCKET_TYPES } from '../';
import { SAMPLER_AGG_NAME } from './sampler';

export const aggRandomSamplerFnName = 'aggRandomSampler';

type Input = any;
type Arguments = AggExpressionFunctionArgs<typeof BUCKET_TYPES.RANDOM_SAMPLER>;

type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggRandomSamplerFnName,
  Input,
  Arguments,
  Output
>;

export const aggSampler = (): FunctionDefinition => ({
  name: aggRandomSamplerFnName,
  help: i18n.translate('data.search.aggs.function.buckets.sampler.help', {
    defaultMessage: 'Generates a serialized agg config for a random sampler agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.sampler.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.sampler.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.sampler.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    probability: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.sampler.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.buckets.terms.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    interval: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.interval.help', {
        defaultMessage: 'Interval to use for this aggregation',
      }),
    },
    timeRange: {
      types: ['timerange'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.timeRange.help', {
        defaultMessage: 'Time Range to use for this aggregation',
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
        type: SAMPLER_AGG_NAME,
        params: {
          ...rest,
        },
      },
    };
  },
});
