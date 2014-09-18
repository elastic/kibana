define(function (require) {
  return function AxesHandlerClass(d3, Private) {
    var _ = require('lodash');

    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Layout = Private(require('components/vislib/lib/layout'));
    var Legend = Private(require('components/vislib/lib/legend'));
    var XAxis = Private(require('components/vislib/lib/x_axis'));
    var YAxis = Private(require('components/vislib/lib/y_axis'));
    var AxisTitle = Private(require('components/vislib/lib/axis_title'));
    var ChartTitle = Private(require('components/vislib/lib/chart_title'));

    _(AxesHandler).inherits(Handler);
    function AxesHandler(vis) {
      if (!(this instanceof AxesHandler)) {
        return new AxesHandler(vis);
      }
      AxesHandler.Super.apply(this, arguments);

      var self = this;

      // Visualization constructors
      this.layout = new Layout(this.el, this.data.injectZeros(), this._attr.type);

      if (this._attr.addLegend) {
        this.legend = new Legend(this.vis, this.el, this.data.getLabels(), this.data.getColorFunc(), this._attr);
      }

      this.axisTitle = new AxisTitle(this.el, this.data.get('xAxisLabel'), this.data.get('yAxisLabel'));
      this.chartTitle = new ChartTitle(this.el);

      this.xAxis = new XAxis({
        el            : this.el,
        xValues       : this.data.xValues(),
        ordered       : this.data.get('ordered'),
        xAxisFormatter: this.data.get('xAxisFormatter'),
        _attr         : this._attr
      });

      this.yAxis = new YAxis({
        el   : this.el,
        yMax : this.data.getYMaxValue(),
        _attr: this._attr
      });

      // Array of objects to render to the visualization
      _.forEach(_.filter([
        this.layout,
        this.legend,
        this.axisTitle,
        this.chartTitle,
        this.yAxis,
        this.xAxis
      ], Boolean), function (_class) {
        self.renderArray.push(_class);
      });
    }

    return AxesHandler;
  };
});

