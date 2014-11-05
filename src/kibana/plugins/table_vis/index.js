define(function (require) {
  require('registry/vis_types').register(function TableVisPrivateModuleLoader(Private) {
    return Private(require('plugins/table_vis/table_vis'));
  });
});