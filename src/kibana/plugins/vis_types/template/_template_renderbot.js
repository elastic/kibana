define(function (require) {
  return function TemplateRenderbotFactory(Private, $compile, $rootScope, $injector) {
    var _ = require('lodash');
    var Renderbot = Private(require('plugins/vis_types/_renderbot'));

    _(TemplateRenderbot).inherits(Renderbot);
    function TemplateRenderbot(vis, $el, opts) {
      TemplateRenderbot.Super.call(this, vis, $el);

      this.opts = opts || {};
      this.$scope = $rootScope.$new();
      this.$scope.vis = vis;

      $el.html($compile(this.vis.type.template)(this.$scope));
    }

    TemplateRenderbot.prototype.render = function (esResp) {
      if (_.isFunction(this.opts.onEsResp)) {
        $injector.invoke(this.opts.onEsResp, this.$scope, {
          vis: this.$scope.vis,
          esResp: esResp,
          $scope: this.$scope
        });
      } else {
        this.$scope.esResp = esResp;
      }
    };

    TemplateRenderbot.prototype.destroy = function () {
      this.$scope.$destroy();
    };

    return TemplateRenderbot;
  };
});
