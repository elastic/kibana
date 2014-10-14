define(function (require) {
  return function VisTypeFactory(Private) {
    var _ = require('lodash');

    var VisTypeSchemas = Private(require('components/vis_types/_schemas'));
    var HistogramConverter = Private(require('components/vis_types/converters/histogram'));

    function VisType(opts) {
      opts = opts || {};

      this.name = opts.name;
      this.title = opts.title;

      this.icon = opts.icon;
      this.vislibParams = opts.vislibParams || {};
      this.responseConverter = opts.responseConverter || HistogramConverter;
      this.listeners = opts.listeners || {};
      this.schemas = opts.schemas || new VisTypeSchemas();
    }

    return VisType;
  };
});