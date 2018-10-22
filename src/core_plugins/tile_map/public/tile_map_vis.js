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

import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import './editors/tile_map_vis_params';
import { supports } from 'ui/utils/supports';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CoordinateMapsVisualizationProvider } from './coordinate_maps_visualization';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { Status } from 'ui/vis/update_status';
import { makeGeoJsonResponseHandler } from './coordinatemap_response_handler';
import { truncatedColorMaps } from 'ui/vislib/components/color/truncated_colormaps';

VisTypesRegistryProvider.register(function TileMapVisType(Private, getAppState, courier, config) {

  const VisFactory = Private(VisFactoryProvider);
  const CoordinateMapsVisualization = Private(CoordinateMapsVisualizationProvider);

  return VisFactory.createBaseVisualization({
    name: 'tile_map',
    title: 'Coordinate Map',
    icon: 'visMapCoordinate',
    description: 'Plot latitude and longitude coordinates on a map',
    category: CATEGORY.MAP,
    visConfig: {
      canDesaturate: !!supports.cssFilters,
      defaults: {
        colorSchema: 'Yellow to Red',
        mapType: 'Scaled Circle Markers',
        isDesaturated: true,
        addTooltip: true,
        heatClusterSize: 1.5,
        legendPosition: 'bottomright',
        mapZoom: 2,
        mapCenter: [0, 0],
        wms: config.get('visualization:tileMap:WMSdefaults')
      }
    },
    requiresUpdateStatus: [Status.AGGS, Status.PARAMS, Status.RESIZE, Status.UI_STATE],
    responseHandler: makeGeoJsonResponseHandler(),
    requiresPartialRows: true,
    visualization: CoordinateMapsVisualization,
    editorConfig: {
      collections: {
        colorSchemas: Object.keys(truncatedColorMaps),
        legendPositions: [{
          value: 'bottomleft',
          text: 'bottom left',
        }, {
          value: 'bottomright',
          text: 'bottom right',
        }, {
          value: 'topleft',
          text: 'top left',
        }, {
          value: 'topright',
          text: 'top right',
        }],
        mapTypes: [
          'Scaled Circle Markers',
          'Shaded Circle Markers',
          'Shaded Geohash Grid',
          'Heatmap'
        ],
        tmsLayers: [],
      },
      optionsTemplate: '<tile-map-vis-params></tile-map-vis-params>',
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Value',
          min: 1,
          max: 1,
          aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          title: 'Geo Coordinates',
          aggFilter: 'geohash_grid',
          min: 1,
          max: 1
        }
      ])
    }
  });

});
