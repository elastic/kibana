/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { VisTypeDefinition } from 'src/plugins/visualizations/public';

// @ts-expect-error
import { supportsCssFilters } from './css_filters';
import { TileMapOptionsLazy } from './components';
import { getDeprecationMessage } from './get_deprecation_message';
import { TileMapVisualizationDependencies } from './plugin';
import { toExpressionAst } from './to_ast';
import { TileMapVisParams } from './types';
import { setTmsLayers } from './services';

export function createTileMapTypeDefinition(
  dependencies: TileMapVisualizationDependencies
): VisTypeDefinition<TileMapVisParams> {
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

      setTmsLayers(tmsLayers);
      if (!vis.params.wms.selectedTmsLayer && tmsLayers.length) {
        vis.params.wms.selectedTmsLayer = tmsLayers[0];
      }
      return vis;
    },
    requiresSearch: true,
  };
}
