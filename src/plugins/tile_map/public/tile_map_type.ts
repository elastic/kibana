/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { BaseVisTypeOptions } from 'src/plugins/visualizations/public';
import { truncatedColorSchemas } from '../../charts/public';

// @ts-expect-error
import { supportsCssFilters } from './css_filters';
import { TileMapOptionsLazy } from './components';
import { getDeprecationMessage } from './get_deprecation_message';
import { TileMapVisualizationDependencies } from './plugin';
import { toExpressionAst } from './to_ast';
import { TileMapVisParams } from './types';
import { MapTypes } from './utils/map_types';

export function createTileMapTypeDefinition(
  dependencies: TileMapVisualizationDependencies
): BaseVisTypeOptions<TileMapVisParams> {
  const { uiSettings, getServiceSettings } = dependencies;

  return {
    name: 'tile_map',
    getInfoMessage: getDeprecationMessage,
    title: i18n.translate('tileMap.vis.mapTitle', {
      defaultMessage: 'Coordinate Map',
    }),
    icon: 'visMapCoordinate',
    description: i18n.translate('tileMap.vis.mapDescription', {
      defaultMessage: 'Plot latitude and longitude coordinates on a map',
    }),
    visConfig: {
      canDesaturate: Boolean(supportsCssFilters),
      defaults: {
        colorSchema: 'Yellow to Red',
        mapType: 'Scaled Circle Markers',
        isDesaturated: true,
        addTooltip: true,
        heatClusterSize: 1.5,
        legendPosition: 'bottomright',
        mapZoom: 2,
        mapCenter: [0, 0],
        wms: uiSettings.get('visualization:tileMap:WMSdefaults'),
      },
    },
    toExpressionAst,
    editorConfig: {
      collections: {
        colorSchemas: truncatedColorSchemas,
        legendPositions: [
          {
            value: 'bottomleft',
            text: i18n.translate('tileMap.vis.editorConfig.legendPositions.bottomLeftText', {
              defaultMessage: 'Bottom left',
            }),
          },
          {
            value: 'bottomright',
            text: i18n.translate('tileMap.vis.editorConfig.legendPositions.bottomRightText', {
              defaultMessage: 'Bottom right',
            }),
          },
          {
            value: 'topleft',
            text: i18n.translate('tileMap.vis.editorConfig.legendPositions.topLeftText', {
              defaultMessage: 'Top left',
            }),
          },
          {
            value: 'topright',
            text: i18n.translate('tileMap.vis.editorConfig.legendPositions.topRightText', {
              defaultMessage: 'Top right',
            }),
          },
        ],
        mapTypes: [
          {
            value: MapTypes.ScaledCircleMarkers,
            text: i18n.translate('tileMap.vis.editorConfig.mapTypes.scaledCircleMarkersText', {
              defaultMessage: 'Scaled circle markers',
            }),
          },
          {
            value: MapTypes.ShadedCircleMarkers,
            text: i18n.translate('tileMap.vis.editorConfig.mapTypes.shadedCircleMarkersText', {
              defaultMessage: 'Shaded circle markers',
            }),
          },
          {
            value: MapTypes.ShadedGeohashGrid,
            text: i18n.translate('tileMap.vis.editorConfig.mapTypes.shadedGeohashGridText', {
              defaultMessage: 'Shaded geohash grid',
            }),
          },
          {
            value: MapTypes.Heatmap,
            text: i18n.translate('tileMap.vis.editorConfig.mapTypes.heatmapText', {
              defaultMessage: 'Heatmap',
            }),
          },
        ],
        tmsLayers: [],
      },
      optionsTemplate: TileMapOptionsLazy,
      schemas: [
        {
          group: 'metrics',
          name: 'metric',
          title: i18n.translate('tileMap.vis.map.editorConfig.schemas.metricTitle', {
            defaultMessage: 'Value',
          }),
          min: 1,
          max: 1,
          aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits'],
          defaults: [{ schema: 'metric', type: 'count' }],
        },
        {
          group: 'buckets',
          name: 'segment',
          title: i18n.translate('tileMap.vis.map.editorConfig.schemas.geoCoordinatesTitle', {
            defaultMessage: 'Geo coordinates',
          }),
          aggFilter: ['geohash_grid'],
          min: 1,
          max: 1,
        },
      ],
    },
    setup: async (vis) => {
      let tmsLayers;

      try {
        const serviceSettings = await getServiceSettings();
        tmsLayers = await serviceSettings.getTMSServices();
      } catch (e) {
        return vis;
      }

      vis.type.editorConfig.collections.tmsLayers = tmsLayers;
      if (!vis.params.wms.selectedTmsLayer && tmsLayers.length) {
        vis.params.wms.selectedTmsLayer = tmsLayers[0];
      }
      return vis;
    },
  };
}
