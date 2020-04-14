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

const aggTypeName = 'terms';
const fnName = 'aggTypeTerms';

type Input = any;
type Arguments = AggExpressionFunctionArgs<typeof aggTypeName>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof fnName, Input, Arguments, Output>;

export const aggTypeTerms = (): FunctionDefinition => ({
  name: fnName,
  help: i18n.translate('data.search.aggs.function.buckets.terms.help', {
    defaultMessage: 'Generates AggConfigJSON for a terms agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: '',
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: '',
    },
    schema: {
      types: ['string'],
      help: '',
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.buckets.terms.field.help', {
        defaultMessage: 'Field to use for terms aggregation',
      }),
    },
    order: {
      types: ['string'],
      required: true,
      help: '',
    },
    orderBy: {
      types: ['string'],
      help: '',
    },
    orderAgg: {
      types: ['agg_type'],
      help: '',
    },
    size: {
      types: ['number'],
      default: 5,
      help: '',
    },
    missingBucket: {
      types: ['boolean'],
      default: false,
      help: '',
    },
    missingBucketLabel: {
      types: ['string'],
      default: i18n.translate('data.search.aggs.buckets.terms.missingBucketLabel', {
        defaultMessage: 'Missing',
        description: `Default label used in charts when documents are missing a field.
      Visible when you create a chart with a terms aggregation and enable "Show missing values"`,
      }),
      help: '',
    },
    otherBucket: {
      types: ['boolean'],
      default: false,
      help: '',
    },
    otherBucketLabel: {
      types: ['string'],
      default: i18n.translate('data.search.aggs.buckets.terms.otherBucketLabel', {
        defaultMessage: 'Other',
      }),
      help: '',
    },
    exclude: {
      types: ['string'],
      help: '',
    },
    include: {
      types: ['string'],
      help: '',
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
        type: aggTypeName,
        params: { ...rest },
      },
    };
  },
});
