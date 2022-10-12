/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { AggExpressionFunctionArgs, AggExpressionType, BUCKET_TYPES } from '..';
import { RANDOM_SAMPLER_AGG_NAME } from './random_sampler';

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

export const aggRandomSampler = (): FunctionDefinition => ({
  name: aggRandomSamplerFnName,
  help: i18n.translate('data.search.aggs.function.buckets.randomSampler.help', {
    defaultMessage: 'Generates a serialized agg config for a Random sampler agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.randomSampler.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.randomSampler.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.randomSampler.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    probability: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.randomSampler.probability.help', {
        defaultMessage: 'The sampling probability',
      }),
    },
    seed: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.randomSampler.seed.help', {
        defaultMessage: 'The seed to generate the random sampling of documents.',
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
        type: RANDOM_SAMPLER_AGG_NAME,
        params: {
          ...rest,
        },
      },
    };
  },
});
