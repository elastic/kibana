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
import { AggExpressionType, AggExpressionFunctionArgs, METRIC_TYPES } from '../';
import { getParsedValue } from '../utils/get_parsed_value';

const fnName = 'aggMovingAvg';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.MOVING_FN>;
type Arguments = Assign<AggArgs, { customMetric?: AggExpressionType }>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof fnName, Input, Arguments, Output>;

export const aggMovingAvg = (): FunctionDefinition => ({
  name: fnName,
  help: i18n.translate('data.search.aggs.function.metrics.moving_avg.help', {
    defaultMessage: 'Generates a serialized agg config for a Moving Average agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.moving_avg.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.metrics.moving_avg.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.moving_avg.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    metricAgg: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.moving_avg.metricAgg.help', {
        defaultMessage:
          'Id for finding agg config to use for building parent pipeline aggregations',
      }),
    },
    customMetric: {
      types: ['agg_type'],
      help: i18n.translate('data.search.aggs.metrics.moving_avg.customMetric.help', {
        defaultMessage: 'Agg config to use for building parent pipeline aggregations',
      }),
    },
    window: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.metrics.moving_avg.window.help', {
        defaultMessage: 'The size of window to "slide" across the histogram.',
      }),
    },
    buckets_path: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.metrics.derivative.buckets_path.help', {
        defaultMessage: 'Path to the metric of interest',
      }),
    },
    script: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.moving_avg.script.help', {
        defaultMessage:
          'Id for finding agg config to use for building parent pipeline aggregations',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.moving_avg.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.moving_avg.customLabel.help', {
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
        type: METRIC_TYPES.MOVING_FN,
        params: {
          ...rest,
          customMetric: args.customMetric?.value,
          json: getParsedValue(args, 'json'),
        },
      },
    };
  },
});
