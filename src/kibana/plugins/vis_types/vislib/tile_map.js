define(function (require) {
  return function TileMapVisType(Private) {
    var VislibVisType = Private(require('plugins/vis_types/vislib/_vislib_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));
    var TileMapConverter = Private(require('plugins/vis_types/vislib/converters/tile_map'));

    return new VislibVisType({
      name: 'tile_map',
      title: 'Tile map',
      icon: 'fa-map-marker',
      params: {
        defaults: {
          mapType: 'Shaded Circle Markers'
        },
        mapTypes: ['Shaded Circle Markers', 'Scaled Circle Markers'],
        editor: require('text!plugins/vis_types/vislib/editors/tile_map.html')
      },
      responseConverter: TileMapConverter,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Value',
          min: 1,
          max: 1,
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
