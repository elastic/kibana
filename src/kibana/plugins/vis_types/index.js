define(function (require) {
  var visTypes = require('registry/vis_types');

  visTypes.register(require('plugins/vis_types/histogram'));
  visTypes.register(require('plugins/vis_types/line'));
  visTypes.register(require('plugins/vis_types/area'));
  visTypes.register(require('plugins/vis_types/pie'));
});
