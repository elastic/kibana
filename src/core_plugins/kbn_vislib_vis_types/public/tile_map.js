import supports from 'ui/utils/supports';
import VisVisTypeProvider from 'ui/vis/vis_type';
import MapsVisTypeVislibVisTypeProvider from 'ui/vis_maps/maps_vis_type';
import VisSchemasProvider from 'ui/vis/schemas';
import AggResponseGeoJsonGeoJsonProvider from 'ui/agg_response/geo_json/geo_json';
import tileMapTemplate from 'plugins/kbn_vislib_vis_types/editors/tile_map.html';
import image from './images/icon-tilemap.svg';

export default function TileMapVisType(Private, getAppState, courier, config) {
  const VisType = Private(VisVisTypeProvider);
  const MapsVisType = Private(MapsVisTypeVislibVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);
  const geoJsonConverter = Private(AggResponseGeoJsonGeoJsonProvider);

  return new MapsVisType({
    name: 'tile_map',
    title: 'Tile Map',
    image,
    description: 'Plot latitude and longitude coordinates on a map',
    category: VisType.CATEGORY.MAP,
    params: {
      defaults: {
        mapType: 'Scaled Circle Markers',
        isDesaturated: true,
        addTooltip: true,
        heatMaxZoom: 0,
        heatMinOpacity: 0.1,
        heatRadius: 25,
        heatBlur: 15,
        heatNormalizeData: true,
        legendPosition: 'bottomright',
        mapZoom: 2,
        mapCenter: [0, 0],
        wms: config.get('visualization:tileMap:WMSdefaults')
      },
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
      mapTypes: ['Scaled Circle Markers',
        'Shaded Circle Markers',
        'Shaded Geohash Grid',
        'Heatmap'
      ],
      canDesaturate: !!supports.cssFilters,
      editor: tileMapTemplate
    },
    responseConverter: geoJsonConverter,
    implementsRenderComplete: true,
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
  });
}
