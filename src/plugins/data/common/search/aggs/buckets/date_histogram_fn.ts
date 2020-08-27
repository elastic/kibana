/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { Assign } from '@kbn/utility-types';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { AggExpressionType, AggExpressionFunctionArgs, BUCKET_TYPES } from '../';
import { getParsedValue } from '../utils/get_parsed_value';

const fnName = 'aggDateHistogram';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.DATE_HISTOGRAM>;

type Arguments = Assign<AggArgs, { timeRange?: string; extended_bounds?: string }>;

type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof fnName, Input, Arguments, Output>;

export const aggDateHistogram = (): FunctionDefinition => ({
  name: fnName,
  help: i18n.translate('data.search.aggs.function.buckets.dateHistogram.help', {
    defaultMessage: 'Generates a serialized agg config for a Histogram agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    useNormalizedEsInterval: {
      types: ['boolean'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.useNormalizedEsInterval.help', {
        defaultMessage: 'Specifies whether to use useNormalizedEsInterval for this aggregation',
      }),
    },
    time_zone: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.timeZone.help', {
        defaultMessage: 'Time zone to use for this aggregation',
      }),
    },
    format: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.format.help', {
        defaultMessage: 'Format to use for this aggregation',
      }),
    },
    scaleMetricValues: {
      types: ['boolean'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.scaleMetricValues.help', {
        defaultMessage: 'Specifies whether to use scaleMetricValues for this aggregation',
      }),
    },
    interval: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.interval.help', {
        defaultMessage: 'Interval to use for this aggregation',
      }),
    },
    timeRange: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.timeRange.help', {
        defaultMessage: 'Time Range to use for this aggregation',
      }),
    },
    min_doc_count: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.minDocCount.help', {
        defaultMessage: 'Minimum document count to use for this aggregation',
      }),
    },
    drop_partials: {
      types: ['boolean'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.dropPartials.help', {
        defaultMessage: 'Specifies whether to use drop_partials for this aggregation',
      }),
    },
    extended_bounds: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.extendedBounds.help', {
        defaultMessage:
          'With extended_bounds setting, you now can "force" the histogram aggregation to start building buckets on a specific min value and also keep on building buckets up to a max value ',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.dateHistogram.customLabel.help', {
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
        type: BUCKET_TYPES.DATE_HISTOGRAM,
        params: {
          ...rest,
          timeRange: getParsedValue(args, 'timeRange'),
          extended_bounds: getParsedValue(args, 'extended_bounds'),
          json: getParsedValue(args, 'json'),
        },
      },
    };
  },
});
