define(function (require) {
  return function TileMapVisType(Private) {
    var VisType = Private(require('components/vis_types/_vis_type'));
    var Schemas = Private(require('components/vis_types/_schemas'));

    return new VisType({
      name: 'tile_map',
      title: 'Tile map',
      icon: 'fa-map-marker',
      vislibParams: {
        shareYAxis: true,
        addTooltip: true,
        addLegend: true,
      },
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
          title: 'Geo coordinates',
          min: 0,
          max: 1
        },
        {
          group: 'buckets',
          name: 'group',
          title: 'Data field',
          min: 0,
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
