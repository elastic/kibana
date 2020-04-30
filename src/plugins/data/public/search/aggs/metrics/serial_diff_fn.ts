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
import { ExpressionFunctionDefinition } from '../../../../../expressions/public';
import { AggExpressionType, AggExpressionFunctionArgs } from '../';

const aggName = 'serial_diff';
const fnName = 'aggSerialDiff';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof aggName>;
type Arguments = Assign<AggArgs, { metricAgg?: string; customMetric?: AggExpressionType }>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof fnName, Input, Arguments, Output>;

export const aggSerialDiff = (): FunctionDefinition => ({
  name: fnName,
  help: i18n.translate('data.search.aggs.function.metrics.serial_diff.help', {
    defaultMessage: 'Generates a serialized agg config for a serial_diff agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.serial_diff.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.metrics.serial_diff.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.serial_diff.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    metricAgg: {
      types: ['string'],
      default: 'custom',
      help: i18n.translate('data.search.aggs.metrics.serial_diff.metricAgg.help', {
        defaultMessage:
          'Id for finding agg config to use for building parent pipeline aggregations',
      }),
    },
    customMetric: {
      types: ['agg_type'],
      help: i18n.translate('data.search.aggs.metrics.serial_diff.customMetric.help', {
        defaultMessage: 'Agg config to use for building parent pipeline aggregations',
      }),
    },
    buckets_path: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.metrics.serial_diff.buckets_path.help', {
        defaultMessage: 'Path to the metric of interest',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.serial_diff.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
  },
  fn: (input, args) => {
    const { id, enabled, schema, ...rest } = args;

    let json;
    try {
      json = args.json ? JSON.parse(args.json) : undefined;
    } catch (e) {
      throw new Error('Unable to parse json argument string');
    }

    // Need to spread this object to work around TS bug:
    // https://github.com/microsoft/TypeScript/issues/15300#issuecomment-436793742
    const customMetric = args.customMetric?.value ? { ...args.customMetric.value } : undefined;

    return {
      type: 'agg_type',
      value: {
        id,
        enabled,
        schema,
        type: aggName,
        params: {
          ...rest,
          customMetric,
          json,
        },
      },
    };
  },
});
