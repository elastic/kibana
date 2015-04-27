define(function (require) {
  return function TileMapVisType(Private, getAppState) {
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
          isDesaturated: true
        },
        mapTypes: ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid', 'Pins'],
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

          // Set the map viewport to our new bounds
          event.visSettings.bounds = [event.bounds.top_left, event.bounds.bottom_right];

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
