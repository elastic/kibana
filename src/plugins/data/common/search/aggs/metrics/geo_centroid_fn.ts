/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { AggExpressionType, AggExpressionFunctionArgs, METRIC_TYPES } from '../';

export const aggGeoCentroidFnName = 'aggGeoCentroid';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.GEO_CENTROID>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggGeoCentroidFnName,
  Input,
  AggArgs,
  Output
>;

export const aggGeoCentroid = (): FunctionDefinition => ({
  name: aggGeoCentroidFnName,
  help: i18n.translate('data.search.aggs.function.metrics.geo_centroid.help', {
    defaultMessage: 'Generates a serialized agg config for a Geo Centroid agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.geo_centroid.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.metrics.geo_centroid.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.geo_centroid.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.metrics.geo_centroid.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.geo_centroid.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.metrics.geo_centroid.customLabel.help', {
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
        type: METRIC_TYPES.GEO_CENTROID,
        params: {
          ...rest,
        },
      },
    };
  },
});
