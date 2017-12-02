import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import './editors/wms_options';
import { supports } from 'ui/utils/supports';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CoordinateMapsVisualizationProvider } from './coordinate_maps_visualization';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import { AggResponseGeoJsonProvider } from 'ui/agg_response/geo_json/geo_json';
import tileMapTemplate from './editors/tile_map.html';
import image from './images/icon-tilemap.svg';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';


VisTypesRegistryProvider.register(function TileMapVisType(Private, getAppState, courier, config) {

  const Schemas = Private(VisSchemasProvider);
  const geoJsonConverter = Private(AggResponseGeoJsonProvider);
  const VisFactory = Private(VisFactoryProvider);
  const CoordinateMapsVisualization = Private(CoordinateMapsVisualizationProvider);

  return VisFactory.createBaseVisualization({
    name: 'tile_map',
    title: 'Coordinate Map',
    image,
    description: 'Plot latitude and longitude coordinates on a map',
    category: CATEGORY.MAP,
    visConfig: {
      canDesaturate: true,
      defaults: {
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
    responseConverter: geoJsonConverter,
    responseHandler: 'basic',
    implementsRenderComplete: true,
    visualization: CoordinateMapsVisualization,
    editorConfig: {
      collections: {
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
        canDesaturate: !!supports.cssFilters
      },
      optionsTemplate: tileMapTemplate,
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
