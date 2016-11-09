define(function (require) {
  return function PieHandler(d3, Private) {
    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Data = Private(require('components/vislib/lib/data'));
    var Legend = Private(require('components/vislib/lib/legend'));
    var ChartTitle = Private(require('components/vislib/lib/chart_title'));
    var SingleYAxisStrategy = Private(require('components/vislib/lib/_single_y_axis_strategy'));
    /*
     * Handler for Pie visualizations.
     */

    return function (vis) {
      var data = new Data(vis.data, vis._attr, new SingleYAxisStrategy());

      return new Handler(vis, {
        legend: new Legend(vis, vis.el, data.pieNames(), data.getPieColorFunc(), vis._attr),
        chartTitle: new ChartTitle(vis.el)
      });
    };
  };
});
