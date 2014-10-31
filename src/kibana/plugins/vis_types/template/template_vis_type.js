define(function (require) {
  return function TemplateVisTypeFactory(Private) {
    var _ = require('lodash');
    var VisType = Private(require('plugins/vis_types/_vis_type'));
    var TemplateRenderbot = Private(require('plugins/vis_types/template/_template_renderbot'));

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
