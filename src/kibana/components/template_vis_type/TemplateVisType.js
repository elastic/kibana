define(function (require) {
  return function TemplateVisTypeFactory(Private) {
    var _ = require('lodash');
    var VisType = Private(require('components/vis/VisType'));
    var TemplateRenderbot = Private(require('components/template_vis_type/TemplateRenderbot'));

    _(TemplateVisType).inherits(VisType);
    function TemplateVisType(opts) {
      TemplateVisType.Super.call(this, opts);

      this.template = opts.template;
      if (!this.template) {
        throw new Error('Missing template for TemplateVisType');
      }
    }

    TemplateVisType.prototype.createRenderbot = function (vis, $el) {
      return new TemplateRenderbot(vis, $el);
    };

    return TemplateVisType;
  };
});
