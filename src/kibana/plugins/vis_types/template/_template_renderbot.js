define(function (require) {
  return function TemplateRenderbotFactory(Private, $compile, $rootScope) {
    var _ = require('lodash');
    var Renderbot = Private(require('plugins/vis_types/_renderbot'));

    _(TemplateRenderbot).inherits(Renderbot);
    function TemplateRenderbot(vis, $el) {
      TemplateRenderbot.Super.call(this, vis, $el);

      this.$scope = $rootScope.$new();
      this.$scope.vis = vis;

      $el.html($compile(this.vis.type.template)(this.$scope));
    }

    TemplateRenderbot.prototype.render = function (esResponse) {
      this.$scope.esResponse = esResponse;
    };

    TemplateRenderbot.prototype.destroy = function () {
      this.$scope.$destroy();
    };

    return TemplateRenderbot;
  };
});
