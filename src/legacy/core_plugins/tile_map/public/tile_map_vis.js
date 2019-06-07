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
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import './editors/tile_map_vis_params';
import { supports } from 'ui/utils/supports';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CoordinateMapsVisualizationProvider } from './coordinate_maps_visualization';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { Status } from 'ui/vis/update_status';
import { truncatedColorMaps } from 'ui/vislib/components/color/truncated_colormaps';
import { convertToGeoJson } from 'ui/vis/map/convert_to_geojson';

VisTypesRegistryProvider.register(function TileMapVisType(Private, config) {

  const VisFactory = Private(VisFactoryProvider);
  const CoordinateMapsVisualization = Private(CoordinateMapsVisualizationProvider);

  return VisFactory.createBaseVisualization({
    name: 'tile_map',
    title: i18n.translate('tileMap.vis.mapTitle', {
      defaultMessage: 'Coordinate Map',
    }),
    icon: 'visMapCoordinate',
    description: i18n.translate('tileMap.vis.mapDescription', {
      defaultMessage: 'Plot latitude and longitude coordinates on a map',
    }),
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
    requiresPartialRows: true,
    visualization: CoordinateMapsVisualization,
    responseHandler: convertToGeoJson,
    editorConfig: {
      collections: {
        colorSchemas: Object.values(truncatedColorMaps).map(value => ({ id: value.id, label: value.label })),
        legendPositions: [{
          value: 'bottomleft',
          text: i18n.translate('tileMap.vis.map.editorConfig.legendPositions.bottomLeftText', {
            defaultMessage: 'bottom left',
          }),
        }, {
          value: 'bottomright',
          text: i18n.translate('tileMap.vis.map.editorConfig.legendPositions.bottomRightText', {
            defaultMessage: 'bottom right',
          }),
        }, {
          value: 'topleft',
          text: i18n.translate('tileMap.vis.map.editorConfig.legendPositions.topLeftText', {
            defaultMessage: 'top left',
          }),
        }, {
          value: 'topright',
          text: i18n.translate('tileMap.vis.map.editorConfig.legendPositions.topRightText', {
            defaultMessage: 'top right',
          }),
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
          title: i18n.translate('tileMap.vis.map.editorConfig.schemas.metricTitle', {
            defaultMessage: 'Value',
          }),
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
          title: i18n.translate('tileMap.vis.map.editorConfig.schemas.geoCoordinatesTitle', {
            defaultMessage: 'Geo Coordinates',
          }),
          aggFilter: 'geohash_grid',
          min: 1,
          max: 1
        }
      ])
    }
  });

});
