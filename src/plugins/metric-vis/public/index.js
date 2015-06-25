define(function (require) {
  require('registry/vis_types').register(function (Private) {
    return Private(require('plugins/metric_vis/metric_vis'));
  });
});