define(function (require) {
  require('registry/vis_types').register(function (Private) {
    return Private(require('plugins/markdown_vis/markdown_vis'));
  });
});