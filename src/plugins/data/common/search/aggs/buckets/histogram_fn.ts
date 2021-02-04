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

export const aggHistogramFnName = 'aggHistogram';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.HISTOGRAM>;

type Arguments = Assign<AggArgs, { extended_bounds?: string }>;

type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggHistogramFnName,
  Input,
  Arguments,
  Output
>;

export const aggHistogram = (): FunctionDefinition => ({
  name: aggHistogramFnName,
  help: i18n.translate('data.search.aggs.function.buckets.histogram.help', {
    defaultMessage: 'Generates a serialized agg config for a Histogram agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.histogram.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.histogram.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.histogram.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.buckets.histogram.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    interval: {
      types: ['number', 'string'],
      required: true,
      help: i18n.translate('data.search.aggs.buckets.histogram.interval.help', {
        defaultMessage: 'Interval to use for this aggregation',
      }),
    },
    intervalBase: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.histogram.intervalBase.help', {
        defaultMessage: 'IntervalBase to use for this aggregation',
      }),
    },
    min_doc_count: {
      types: ['boolean'],
      help: i18n.translate('data.search.aggs.buckets.histogram.minDocCount.help', {
        defaultMessage: 'Specifies whether to use min_doc_count for this aggregation',
      }),
    },
    maxBars: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.histogram.maxBars.help', {
        defaultMessage: 'Calculate interval to get approximately this many bars',
      }),
    },
    has_extended_bounds: {
      types: ['boolean'],
      help: i18n.translate('data.search.aggs.buckets.histogram.hasExtendedBounds.help', {
        defaultMessage: 'Specifies whether to use has_extended_bounds for this aggregation',
      }),
    },
    extended_bounds: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.histogram.extendedBounds.help', {
        defaultMessage:
          'With extended_bounds setting, you now can "force" the histogram aggregation to start building buckets on a specific min value and also keep on building buckets up to a max value ',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.histogram.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.histogram.customLabel.help', {
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
        type: BUCKET_TYPES.HISTOGRAM,
        params: {
          ...rest,
          extended_bounds: getParsedValue(args, 'extended_bounds'),
        },
      },
    };
  },
});
