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
import { ExpressionFunctionDefinition } from '../../../../../expressions/public';
import { AggExpressionType, AggExpressionFunctionArgs } from '../';

const aggName = 'top_hit';
const fnName = 'aggTopHit';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof aggName>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof fnName, Input, AggArgs, Output>;

export const aggTopHit = (): FunctionDefinition => ({
  name: fnName,
  help: i18n.translate('data.search.aggs.function.metrics.top_hit.help', {
    defaultMessage: 'Generates a serialized agg config for a top_hit agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.top_hit.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.metrics.top_hit.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.top_hit.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.metrics.top_hit.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    aggregate: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.metrics.top_hit.aggregate.help', {
        defaultMessage: 'Aggregate type',
      }),
    },
    size: {
      types: ['number'],
      default: 1,
      help: i18n.translate('data.search.aggs.metrics.top_hit.size.help', {
        defaultMessage: 'Max number of buckets to retrieve',
      }),
    },
    sortOrder: {
      types: ['string'],
      default: 'desc',
      help: i18n.translate('data.search.aggs.metrics.top_hit.sortOrder.help', {
        defaultMessage: 'Order in which to return the results: asc or desc',
      }),
    },
    sortField: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.metrics.top_hit.sortField.help', {
        defaultMessage: 'Field to order results by',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.top_hit.json.help', {
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

    return {
      type: 'agg_type',
      value: {
        id,
        enabled,
        schema,
        type: aggName,
        params: {
          ...rest,
          json,
        },
      },
    };
  },
});
