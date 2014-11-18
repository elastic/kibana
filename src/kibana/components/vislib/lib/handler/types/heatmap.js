define(function (require) {
  return function HeatMapHandler(d3, Private) {
    var injectZeros = Private(require('components/vislib/components/zero_injection/inject_zeros'));
    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Data = Private(require('components/vislib/lib/data'));

    /*
     * Handler for Heatmap visualizations.
     */

    return function (vis) {
      var data = new Data(injectZeros(vis.data), vis._attr);

      return new Handler(vis, {});
    };
  };
});
