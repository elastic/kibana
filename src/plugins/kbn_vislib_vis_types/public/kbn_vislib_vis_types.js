define(function (require) {
  const visTypes = require('ui/registry/vis_types');
  visTypes.register(require('plugins/kbn_vislib_vis_types/histogram'));
  visTypes.register(require('plugins/kbn_vislib_vis_types/line'));
  visTypes.register(require('plugins/kbn_vislib_vis_types/pie'));
  visTypes.register(require('plugins/kbn_vislib_vis_types/area'));
  visTypes.register(require('plugins/kbn_vislib_vis_types/tileMap'));
});
