define(function (require) {
  return function PieHandlerClass(d3, Private) {
    var _ = require('lodash');

    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Layout = Private(require('components/vislib/lib/layout'));
    var Legend = Private(require('components/vislib/lib/legend'));
    var ChartTitle = Private(require('components/vislib/lib/chart_title'));

    _(PieHandler).inherits(Handler);
    function PieHandler(vis) {
      if (!(this instanceof PieHandler)) {
        return new PieHandler(vis);
      }
      PieHandler.Super.apply(this, arguments);

      var self = this;

      // Visualization constructors
      this.layout = new Layout(this.el, this.data.root(), this._attr.type);

      if (this._attr.addLegend) {
        this.legend = new Legend(this.vis, this.el, this.data.getLabelsAndXValues(), this.data.getPieColorFunc(), this._attr);
      }

      this.chartTitle = new ChartTitle(this.el);

      // Array of objects to render to the visualization
      _.forEach(_.filter([
        this.layout,
        this.legend,
        this.chartTitle
      ], Boolean), function (_class) {
        self.renderArray.push(_class);
      });
    }

    return PieHandler;
  };
});
