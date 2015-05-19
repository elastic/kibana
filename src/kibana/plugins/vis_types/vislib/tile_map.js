define(function (require) {
  return function TileMapVisType(Private, getAppState, courier, config) {
    var VislibVisType = Private(require('plugins/vis_types/vislib/_vislib_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));
    var geoJsonConverter = Private(require('components/agg_response/geo_json/geo_json'));
    var _ = require('lodash');

    return new VislibVisType({
      name: 'tile_map',
      title: 'Tile map',
      icon: 'fa-map-marker',
      description: 'Your source for geographic maps. Requires an elasticsearch geo_point field. More specifically, a field ' +
       'that is mapped as type:geo_point with latitude and longitude coordinates.',
      params: {
        defaults: {
          mapType: 'Scaled Circle Markers',
          isDesaturated: true,
          heatMaxZoom: 16,
          heatMinOpacity: 0.1,
          heatRadius: 25,
          heatBlur: 15,
          heatNormalizeData: true,
          addTooltip: true
        },
        mapTypes: ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid', 'Heatmap'],
        editor: require('text!plugins/vis_types/vislib/editors/tile_map.html')
      },
      listeners: {
        rectangle: function (event) {
          var agg = _.deepGet(event, 'data.geoJson.properties.agg');
          if (!agg) return;

          var pushFilter = Private(require('components/filter_bar/push_filter'))(getAppState());
          var indexPatternName = agg.geo.vis.indexPattern.id;
          var field = agg.geo.fieldName();
          var filter = {geo_bounding_box: {}};
          filter.geo_bounding_box[field] = event.bounds;

          pushFilter(filter, false, indexPatternName);
        },
        mapZoomEnd: function (event) {
          var agg = _.deepGet(event, 'data.properties.agg.geo');
          if (!agg || !agg.params.autoPrecision) return;

          // zoomPrecision maps event.zoom to a geohash precision value
          // event.limit is the configurable max geohash precision
          // default max precision is 7, configurable up to 12
          var zoomPrecision = {
            1: 2,
            2: 2,
            3: 2,
            4: 3,
            5: 3,
            6: 4,
            7: 4,
            8: 5,
            9: 5,
            10: 6,
            11: 6,
            12: 7,
            13: 7,
            14: 8,
            15: 9,
            16: 10,
            17: 11,
            18: 12
          };

          agg.params.precision = Math.min(zoomPrecision[event.zoom], config.get('visualization:tileMap:maxPrecision'));

          courier.fetch();
        }
      },
      responseConverter: geoJsonConverter,
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
          min: 0,
          max: 1
        }
      ])
    });
  };
});
