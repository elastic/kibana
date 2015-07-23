define(function (require) {
  return function PieHandler(d3, Private) {
    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Data = Private(require('components/vislib/lib/data'));
    var Legend = Private(require('components/vislib/lib/legend'));
    var ChartTitle = Private(require('components/vislib/lib/chart_title'));

    /*
     * Handler for Pie visualizations.
     */

    return function (vis) {
      return new Handler(vis, {
        legend: new Legend(vis),
        chartTitle: new ChartTitle(vis.el)
      });
    };
  };
});
