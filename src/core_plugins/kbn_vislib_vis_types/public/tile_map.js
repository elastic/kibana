import _ from 'lodash';
import supports from 'ui/utils/supports';
import MapsVisTypeVislibVisTypeProvider from 'ui/vis_maps/maps_vis_type';
import VisSchemasProvider from 'ui/vis/schemas';
import AggResponseGeoJsonGeoJsonProvider from 'ui/agg_response/geo_json/geo_json';
import FilterBarPushFilterProvider from 'ui/filter_bar/push_filter';
import tileMapTemplate from 'plugins/kbn_vislib_vis_types/editors/tile_map.html';

export default function TileMapVisType(Private, getAppState, courier, config) {
  const MapsVisType = Private(MapsVisTypeVislibVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);
  const geoJsonConverter = Private(AggResponseGeoJsonGeoJsonProvider);

  return new MapsVisType({
    name: 'tile_map',
    title: 'Tile map',
    icon: 'fa-map-marker',
    description: 'Your source for geographic maps. Requires an elasticsearch geo_point field. More specifically, a field ' +
     'that is mapped as type:geo_point with latitude and longitude coordinates.',
    params: {
      defaults: {
        mapType: 'Scaled Circle Markers',
        isDesaturated: true,
        addTooltip: true,
        heatMaxZoom: 16,
        heatMinOpacity: 0.1,
        heatRadius: 25,
        heatBlur: 15,
        heatNormalizeData: true,
        legendPosition: 'bottomright',
        mapZoom: 2,
        mapCenter: [15, 5],
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
      mapTypes: ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid', 'Heatmap'],
      canDesaturate: !!supports.cssFilters,
      editor: tileMapTemplate
    },
    listeners: {
      rectangle: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;

        const pushFilter = Private(FilterBarPushFilterProvider)(getAppState());
        const indexPatternName = agg.vis.indexPattern.id;
        const field = agg.fieldName();
        const filter = {geo_bounding_box: {}};
        filter.geo_bounding_box[field] = event.bounds;

        pushFilter(filter, false, indexPatternName);
      },
      mapMoveEnd: function (event) {
        const vis = _.get(event, 'chart.geohashGridAgg.vis');
        if (vis && vis.hasUiState()) {
          vis.getUiState().set('mapCenter', event.center);
        }
      },
      mapZoomEnd: function (event) {
        const vis = _.get(event, 'chart.geohashGridAgg.vis');
        if (vis && vis.hasUiState()) {
          vis.getUiState().set('mapZoom', event.zoom);
        }

        const autoPrecision = _.get(event, 'chart.geohashGridAgg.params.autoPrecision');
        if (autoPrecision) {
          courier.fetch();
        }
      }
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
        aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality'],
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
      },
      {
        group: 'buckets',
        name: 'split',
        title: 'Split Chart',
        deprecate: true,
        deprecateMessage: 'The Split Chart feature for Tile Maps has been deprecated.',
        min: 0,
        max: 1
      }
    ])
  });
};
