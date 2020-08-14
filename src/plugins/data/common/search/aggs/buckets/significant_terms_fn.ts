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
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { AggExpressionType, AggExpressionFunctionArgs, BUCKET_TYPES } from '../';
import { getParsedValue } from '../utils/get_parsed_value';

const fnName = 'aggSignificantTerms';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.SIGNIFICANT_TERMS>;

type Arguments = AggArgs;

type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof fnName, Input, Arguments, Output>;

export const aggSignificantTerms = (): FunctionDefinition => ({
  name: fnName,
  help: i18n.translate('data.search.aggs.function.buckets.significantTerms.help', {
    defaultMessage: 'Generates a serialized agg config for a Significant Terms agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.significantTerms.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.significantTerms.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.significantTerms.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.buckets.significantTerms.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    size: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.significantTerms.size.help', {
        defaultMessage: 'Max number of buckets to retrieve',
      }),
    },
    exclude: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.significantTerms.exclude.help', {
        defaultMessage: 'Specific bucket values to exclude from results',
      }),
    },
    include: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.significantTerms.include.help', {
        defaultMessage: 'Specific bucket values to include in results',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.significantTerms.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.significantTerms.customLabel.help', {
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
        type: BUCKET_TYPES.SIGNIFICANT_TERMS,
        params: {
          ...rest,
          json: getParsedValue(args, 'json'),
        },
      },
    };
  },
});
