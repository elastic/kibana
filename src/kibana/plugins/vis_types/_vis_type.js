define(function (require) {
  return function VisTypeFactory(Private) {
    var VisTypeSchemas = Private(require('plugins/vis_types/_schemas'));

    function VisType(opts) {
      opts = opts || {};

      this.name = opts.name;
      this.title = opts.title;
      this.responseConverter = opts.responseConverter;
      this.hierarchicalData = opts.hierarchicalData || false;
      this.icon = opts.icon;
      this.schemas = opts.schemas || new VisTypeSchemas();
      this.params = opts.params || {};
    }

    return VisType;
  };
});
