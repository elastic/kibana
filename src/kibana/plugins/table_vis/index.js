define(function (require) {
  require('registry/vis_types').register(function TableVisPrivateMoudleLoader(Private) {
    return Private(require('plugins/table_vis/table_vis'));
  });
});