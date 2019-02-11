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

import { convertToGeoJson } from 'ui/vis/map/convert_to_geojson';
import { i18n } from '@kbn/i18n';

export const tilemap = () => ({
  name: 'tilemap',
  type: 'render',
  context: {
    types: [
      'kibana_datatable'
    ],
  },
  help: i18n.translate('interpreter.functions.tilemap.help', {
    defaultMessage: 'Tilemap visualization'
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
    },
  },
  fn(context, args) {
    const visConfigParams = JSON.parse(args.visConfig);

    const convertedData = convertToGeoJson(context, {
      geohash: visConfigParams.geohash,
      metric: visConfigParams.metric,
      geocentroid: visConfigParams.geocentroid,
    });

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: convertedData,
        visType: 'tile_map',
        visConfig: visConfigParams,
        params: {
          listenOnChange: true,
        }
      },
    };
  },
});
