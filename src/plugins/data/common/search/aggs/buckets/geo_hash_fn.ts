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
import { AggExpressionType, AggExpressionFunctionArgs, BUCKET_TYPES } from '../';
import { getParsedValue } from '../utils/get_parsed_value';

const fnName = 'aggGeoHash';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.GEOHASH_GRID>;

type Arguments = Assign<AggArgs, { boundingBox?: string }>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof fnName, Input, Arguments, Output>;

export const aggGeoHash = (): FunctionDefinition => ({
  name: fnName,
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
      types: ['string'],
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
  fn: (input, args) => {
    const { id, enabled, schema, ...rest } = args;

    return {
      type: 'agg_type',
      value: {
        id,
        enabled,
        schema,
        type: BUCKET_TYPES.GEOHASH_GRID,
        params: {
          ...rest,
          boundingBox: getParsedValue(args, 'boundingBox'),
          json: getParsedValue(args, 'json'),
        },
      },
    };
  },
});
