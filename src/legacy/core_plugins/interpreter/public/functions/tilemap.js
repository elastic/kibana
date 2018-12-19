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

import { makeGeoJsonResponseHandler } from 'plugins/tile_map/coordinatemap_response_handler';
import { i18n } from '@kbn/i18n';

const responseHandler = makeGeoJsonResponseHandler();

export const tilemap = () => ({
  name: 'tilemap',
  type: 'render',
  context: {
    types: [
      'kibana_table'
    ],
  },
  help: i18n.translate('common.core_plugins.interpreter.public.functions.tilemap.help', {
    defaultMessage: 'Tilemap visualization'
  }),
  args: {
    bucket: {
      types: ['string'],
      default: '0',
    },
    metric: {
      types: ['string'],
      default: '1',
    },
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
    },
  },
  fn(context, args) {
    const visConfigParams = JSON.parse(args.visConfig);
    const metricColumn = context.columns.find((column, i) =>
      column.id === args.metric || column.name === args.metric || i === parseInt(args.metric)
    );
    const bucketColumn = context.columns.find((column, i) =>
      column.id === args.bucket || column.name === args.bucket || i === parseInt(args.bucket)
    );

    metricColumn.aggConfig.schema = 'metric';
    bucketColumn.aggConfig.schema = 'segment';

    const convertedData = responseHandler(context);

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: convertedData,
        visConfig: {
          type: 'tile_map',
          params: visConfigParams,
        },
        params: {
          listenOnChange: true,
        }
      },
    };
  },
});
