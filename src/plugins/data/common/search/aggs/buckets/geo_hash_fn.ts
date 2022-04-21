/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Assign } from '@kbn/utility-types';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';

import { GeoBoundingBoxOutput } from '../../expressions';
import { AggExpressionType, AggExpressionFunctionArgs, BUCKET_TYPES } from '..';

export const aggGeoHashFnName = 'aggGeoHash';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.GEOHASH_GRID>;

type Arguments = Assign<AggArgs, { boundingBox?: GeoBoundingBoxOutput }>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggGeoHashFnName,
  Input,
  Arguments,
  Output
>;

export const aggGeoHash = (): FunctionDefinition => ({
  name: aggGeoHashFnName,
  help: i18n.translate('data.search.aggs.function.buckets.geoHash.help', {
    defaultMessage: 'Generates a serialized agg config for a Geo Hash agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.geoHash.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.geoHash.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.geoHash.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.buckets.geoHash.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    useGeocentroid: {
      types: ['boolean'],
      help: i18n.translate('data.search.aggs.buckets.geoHash.useGeocentroid.help', {
        defaultMessage: 'Specifies whether to use geocentroid for this aggregation',
      }),
    },
    autoPrecision: {
      types: ['boolean'],
      help: i18n.translate('data.search.aggs.buckets.geoHash.autoPrecision.help', {
        defaultMessage: 'Specifies whether to use auto precision for this aggregation',
      }),
    },
    isFilteredByCollar: {
      types: ['boolean'],
      help: i18n.translate('data.search.aggs.buckets.geoHash.isFilteredByCollar.help', {
        defaultMessage: 'Specifies whether to filter by collar',
      }),
    },
    boundingBox: {
      types: ['geo_bounding_box'],
      help: i18n.translate('data.search.aggs.buckets.geoHash.boundingBox.help', {
        defaultMessage: 'Filter results based on a point location within a bounding box',
      }),
    },
    precision: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.geoHash.precision.help', {
        defaultMessage: 'Precision to use for this aggregation.',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.geoHash.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.geoHash.customLabel.help', {
        defaultMessage: 'Represents a custom label for this aggregation',
      }),
    },
  },
  fn: (input, { id, enabled, schema, boundingBox, ...params }) => {
    return {
      type: 'agg_type',
      value: {
        id,
        enabled,
        schema,
        params: {
          ...params,
          boundingBox: boundingBox && omit(boundingBox, 'type'),
        },
        type: BUCKET_TYPES.GEOHASH_GRID,
      },
    };
  },
});
