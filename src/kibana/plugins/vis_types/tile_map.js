define(function (require) {
  return function TileMapVisType(Private) {
    var VisType = Private(require('plugins/vis_types/_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));
    var TileMapConverter = Private(require('plugins/vis_types/converters/tile_map'));

    return new VisType({
      name: 'tile_map',
      title: 'Tile map',
      icon: 'fa-map-marker',
      vislibParams: {
        //addTooltip: true
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
