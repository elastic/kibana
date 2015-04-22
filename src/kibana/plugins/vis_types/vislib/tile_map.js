define(function (require) {
  return function TileMapVisType(Private) {
    var VislibVisType = Private(require('plugins/vis_types/vislib/_vislib_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));
    var geoJsonConverter = Private(require('components/agg_response/geo_json/geo_json'));

    return new VislibVisType({
      name: 'tile_map',
      title: 'Tile map',
      icon: 'fa-map-marker',
      description: 'Your source for geographic maps. Requires an elasticsearch geo_point field. More specifically, a field ' +
       'that is mapped as type:geo_point with latitude and longitude coordinates.',
      params: {
        defaults: {
          mapType: 'Shaded Circle Markers',
          heatMaxZoom: 16,
          heatMinOpacity: 0.1,
          heatRadius: 25,
          heatBlur: 15,
          heatNormalizeData: true,
          isDesaturated: true,
          addLeafletPopup: true
        },
        mapTypes: ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid', 'Heatmap', 'Pins'],
        editor: require('text!plugins/vis_types/vislib/editors/tile_map.html')
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
