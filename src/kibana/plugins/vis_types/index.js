define(function (require) {
  var visTypes = require('registry/vis_types');
  visTypes.register(require('plugins/vis_types/vislib/histogram'));
  visTypes.register(require('plugins/vis_types/vislib/line'));
  visTypes.register(require('plugins/vis_types/vislib/pie'));
  visTypes.register(require('plugins/vis_types/vislib/area'));
  visTypes.register(require('plugins/vis_types/vislib/tile_map'));
});
