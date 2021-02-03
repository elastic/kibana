/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { AggExpressionType, AggExpressionFunctionArgs, METRIC_TYPES } from '../';

export const aggGeoBoundsFnName = 'aggGeoBounds';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.GEO_BOUNDS>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggGeoBoundsFnName,
  Input,
  AggArgs,
  Output
>;

export const aggGeoBounds = (): FunctionDefinition => ({
  name: aggGeoBoundsFnName,
  help: i18n.translate('data.search.aggs.function.metrics.geo_bounds.help', {
    defaultMessage: 'Generates a serialized agg config for a Geo Bounds agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.geo_bounds.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.metrics.geo_bounds.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.geo_bounds.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.metrics.geo_bounds.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.geo_bounds.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.geo_bounds.customLabel.help', {
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
        type: METRIC_TYPES.GEO_BOUNDS,
        params: {
          ...rest,
        },
      },
    };
  },
});
