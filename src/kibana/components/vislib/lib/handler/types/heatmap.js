define(function (require) {
  return function HeatMapHandler(d3, Private) {
    var _ = require('lodash');
    var injectZeros = Private(require('components/vislib/components/zero_injection/inject_zeros'));
    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Data = Private(require('components/vislib/lib/data'));
    var Legend = Private(require('components/vislib/lib/legend'));

    /*
     * Handler for Heatmap visualizations.
     */

    return function (vis) {
      var data = new Data(injectZeros(vis.data), vis._attr);

      var valRange = vis._attr.valRange = _.chain(data.data.series)
        .pluck('values')
        .flatten()
        .pluck('y')
        .without(0)
        .value();
      var valExtents = vis._attr.valExtents = [_.min(valRange), _.max(valRange)];
      var colors = vis._attr.colors = ['#d1e8c9', '#9fda9a', '#5dcb6c', '#2fa757', '#1f7f52', '#125946'];
      var quantizeColor = vis._attr.quantizeColor = d3.scale.quantize()
        .range(colors)
        .domain([vis._attr.valExtents[0], vis._attr.valExtents[1]]);
      var legendRanges = vis._attr.legendRanges = ['0'];
      for (var i = 0; i < vis._attr.colors.length; i++) {
        var cols = Math.floor(vis._attr.quantizeColor.invertExtent(vis._attr.colors[i])[0]);
        cols += ' – ';
        cols += Math.floor(vis._attr.quantizeColor.invertExtent(vis._attr.colors[i])[1]);
        vis._attr.legendRanges.push(cols);
      }
      var colList = _.flatten(['#f2f2f2', vis._attr.colors]);
      var colorObj = _.zipObject(vis._attr.legendRanges, colList);
      var getHeatmapColor = vis._attr.getHeatmapColor = function (val) {
        return colorObj[val];
      };

      return new Handler(vis, {
        data: data,
        legend: new Legend(vis, vis.el, vis._attr.legendRanges, vis._attr.getHeatmapColor, vis._attr)
      });
    };
  };
});
