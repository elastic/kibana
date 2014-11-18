define(function (require) {
  return function HeatMapHandler(d3, Private) {
    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Data = Private(require('components/vislib/lib/data'));

    /*
     * Handler for Heatmap visualizations.
     */

    return function (vis) {
      var data = new Data(vis.data, vis._attr);

      return new Handler(vis, {});
    };
  };
});
