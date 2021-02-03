/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Assign } from '@kbn/utility-types';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { AggExpressionType, AggExpressionFunctionArgs, BUCKET_TYPES } from '../';
import { getParsedValue } from '../utils/get_parsed_value';

export const aggFilterFnName = 'aggFilter';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.FILTER>;

type Arguments = Assign<AggArgs, { geo_bounding_box?: string }>;

type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggFilterFnName,
  Input,
  Arguments,
  Output
>;

export const aggFilter = (): FunctionDefinition => ({
  name: aggFilterFnName,
  help: i18n.translate('data.search.aggs.function.buckets.filter.help', {
    defaultMessage: 'Generates a serialized agg config for a Filter agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.filter.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.filter.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.filter.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    geo_bounding_box: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.filter.geoBoundingBox.help', {
        defaultMessage: 'Filter results based on a point location within a bounding box',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.filter.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.filter.customLabel.help', {
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
        type: BUCKET_TYPES.FILTER,
        params: {
          ...rest,
          geo_bounding_box: getParsedValue(args, 'geo_bounding_box'),
        },
      },
    };
  },
});
