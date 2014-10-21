define(function (require) {
  return function ColumnHandler(d3, Private) {
    var injectZeros = Private(require('components/vislib/components/zero_injection/inject_zeros'));
    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Data = Private(require('components/vislib/lib/data'));
    var Legend = Private(require('components/vislib/lib/legend'));
    var XAxis = Private(require('components/vislib/lib/x_axis'));
    var YAxis = Private(require('components/vislib/lib/y_axis'));
    var AxisTitle = Private(require('components/vislib/lib/axis_title'));
    var ChartTitle = Private(require('components/vislib/lib/chart_title'));

    /*
     * Handler for Column Chart, Line Chart, and other charts using x and y axes.
     * Otherwise known as the default Handler type.
     */

    return function (vis) {
      var data = new Data(injectZeros(vis.data), vis._attr);

      return new Handler(vis, {
        data: data,
        legend: new Legend(vis, vis.el, data.getLabels(), data.getColorFunc(), vis._attr),
        axisTitle: new AxisTitle(vis.el, data.get('xAxisLabel'), data.get('yAxisLabel')),
        chartTitle: new ChartTitle(vis.el),
        xAxis: new XAxis({
          el            : vis.el,
          xValues       : data.xValues(),
          ordered       : data.get('ordered'),
          xAxisFormatter: data.get('xAxisFormatter'),
          _attr         : vis._attr
        }),
        yAxis: new YAxis({
          el   : vis.el,
          yMax : data.getYMaxValue(),
          _attr: vis._attr
        })
      });
    };
  };
});

