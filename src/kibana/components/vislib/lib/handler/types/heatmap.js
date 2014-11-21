define(function (require) {
  return function HeatMapHandler(d3, Private) {
    var injectZeros = Private(require('components/vislib/components/zero_injection/inject_zeros'));
    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Data = Private(require('components/vislib/lib/data'));
    var Legend = Private(require('components/vislib/lib/legend'));

    /*
     * Handler for Heatmap visualizations.
     */

    return function (vis) {
      var data = new Data(injectZeros(vis.data), vis._attr);
      return new Handler(vis, {
        data: data,
        legend: new Legend(vis, vis.el, data.getLabels(), data.getColorFunc(), vis._attr)
      });
    };
  };
});
