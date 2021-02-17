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
import { AggExpressionType, AggExpressionFunctionArgs, METRIC_TYPES } from '../';

export const aggBucketAvgFnName = 'aggBucketAvg';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.AVG_BUCKET>;
type Arguments = Assign<
  AggArgs,
  { customBucket?: AggExpressionType; customMetric?: AggExpressionType }
>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggBucketAvgFnName,
  Input,
  Arguments,
  Output
>;

export const aggBucketAvg = (): FunctionDefinition => ({
  name: aggBucketAvgFnName,
  help: i18n.translate('data.search.aggs.function.metrics.bucket_avg.help', {
    defaultMessage: 'Generates a serialized agg config for a Avg Bucket agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.bucket_avg.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.metrics.bucket_avg.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.bucket_avg.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    customBucket: {
      types: ['agg_type'],
      help: i18n.translate('data.search.aggs.metrics.bucket_avg.customBucket.help', {
        defaultMessage: 'Agg config to use for building sibling pipeline aggregations',
      }),
    },
    customMetric: {
      types: ['agg_type'],
      help: i18n.translate('data.search.aggs.metrics.bucket_avg.customMetric.help', {
        defaultMessage: 'Agg config to use for building sibling pipeline aggregations',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.bucket_avg.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.bucket_avg.customLabel.help', {
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
        type: METRIC_TYPES.AVG_BUCKET,
        params: {
          ...rest,
          customBucket: args.customBucket?.value,
          customMetric: args.customMetric?.value,
        },
      },
    };
  },
});
