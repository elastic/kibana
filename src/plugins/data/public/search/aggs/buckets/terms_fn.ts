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

const aggName = 'terms';
const fnName = 'aggTerms';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof aggName>;
// Since the orderAgg param is an agg nested in a subexpression, we need to
// overwrite the param type to expect a value of type AggExpressionType.
type Arguments = AggArgs &
  Assign<
    AggArgs,
    { orderAgg?: AggArgs['orderAgg'] extends undefined ? undefined : AggExpressionType }
  >;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof fnName, Input, Arguments, Output>;

export const aggTerms = (): FunctionDefinition => ({
  name: fnName,
  help: i18n.translate('data.search.aggs.function.buckets.terms.help', {
    defaultMessage: 'Generates a serialized agg config for a terms agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.terms.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.terms.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.terms.schema.help', {
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
    order: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.buckets.terms.order.help', {
        defaultMessage: 'Order in which to return the results: asc or desc',
      }),
    },
    orderBy: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.terms.orderBy.help', {
        defaultMessage: 'Field to order results by',
      }),
    },
    orderAgg: {
      types: ['agg_type'],
      help: i18n.translate('data.search.aggs.buckets.terms.orderAgg.help', {
        defaultMessage: 'Agg config to use for ordering results',
      }),
    },
    size: {
      types: ['number'],
      default: 5,
      help: i18n.translate('data.search.aggs.buckets.terms.size.help', {
        defaultMessage: 'Max number of buckets to retrieve',
      }),
    },
    missingBucket: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('data.search.aggs.buckets.terms.missingBucket.help', {
        defaultMessage: 'When set to true, groups together any buckets with missing fields',
      }),
    },
    missingBucketLabel: {
      types: ['string'],
      default: i18n.translate('data.search.aggs.buckets.terms.missingBucketLabel', {
        defaultMessage: 'Missing',
        description: `Default label used in charts when documents are missing a field.
      Visible when you create a chart with a terms aggregation and enable "Show missing values"`,
      }),
      help: i18n.translate('data.search.aggs.buckets.terms.missingBucketLabel.help', {
        defaultMessage: 'Default label used in charts when documents are missing a field.',
      }),
    },
    otherBucket: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('data.search.aggs.buckets.terms.otherBucket.help', {
        defaultMessage: 'When set to true, groups together any buckets beyond the allowed size',
      }),
    },
    otherBucketLabel: {
      types: ['string'],
      default: i18n.translate('data.search.aggs.buckets.terms.otherBucketLabel', {
        defaultMessage: 'Other',
      }),
      help: i18n.translate('data.search.aggs.buckets.terms.otherBucketLabel.help', {
        defaultMessage: 'Default label used in charts for documents in the Other bucket',
      }),
    },
    exclude: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.terms.exclude.help', {
        defaultMessage: 'Specific bucket values to exclude from results',
      }),
    },
    include: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.terms.include.help', {
        defaultMessage: 'Specific bucket values to include in results',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.terms.json.help', {
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
    const orderAgg = args.orderAgg?.value ? { ...args.orderAgg.value } : undefined;

    return {
      type: 'agg_type',
      value: {
        id,
        enabled,
        schema,
        type: aggName,
        params: {
          ...rest,
          orderAgg,
          json,
        },
      },
    };
  },
});
