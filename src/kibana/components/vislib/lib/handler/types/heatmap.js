define(function (require) {
  return function HeatMapHandler(d3, Private) {
    var _ = require('lodash');
    var injectZeros = Private(require('components/vislib/components/zero_injection/inject_zeros'));
    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Data = Private(require('components/vislib/lib/data'));
    var Legend = Private(require('components/vislib/lib/legend'));
    var AxisTitle = Private(require('components/vislib/lib/axis_title'));
    var ChartTitle = Private(require('components/vislib/lib/chart_title'));
    /*
     * Handler for Heatmap visualizations.
     */

    return function (vis) {
      var data = new Data(injectZeros(vis.data), vis._attr);

      data._attr.margin = {
        top: 5,
        right: 5,
        bottom: 16,
        left: 80
      };

      // configurable vars
      var zeroColor = vis._attr.zeroColor = '#f2f2f2';
      var colors = vis._attr.colors = ['#d1e8c9', '#9fda9a', '#5dcb6c', '#2fa757', '#1f7f52', '#125946'];
      var colorScaleType = vis._attr.colorScaleType = 'quantize';

      // get intensityData, valRange, valExtents
      var intensityData;
      if (data.data.rows) {
        intensityData = _.chain(data.data.rows)
          .pluck('series')
          .flatten().value();
      } else if (data.data.columns) {
        intensityData = _.chain(data.data.columns)
          .pluck('series')
          .flatten().value();
      } else {
        intensityData = data.data.series;
      }
      var valRange = vis._attr.valRange = _.chain(intensityData)
        .pluck('values')
        .flatten()
        .pluck('y')
        .without(0)
        .value();
      var valExtents = vis._attr.valExtents = [_.min(valRange), _.max(valRange)];

      // color scale
      var colorScale = vis._attr.colorScale;
      if (colorScaleType === 'quantize') {
        colorScale = vis._attr.colorScale = d3.scale.quantize()
          .range(colors)
          .domain([valExtents[0], valExtents[1]]);
      } else {
        colorScale = vis._attr.colorScale = d3.scale.quantile()
          .range(_.range(colors.length))
          .domain(valRange);
      }

      // legend data
      var legendRanges = vis._attr.legendRanges = ['0'];
      var inc;
      for (var i = 0; i < vis._attr.colors.length; i++) {
        if (colorScaleType === 'quantize') {
          inc = colors[i];
        } else {
          inc = i;
        }
        var cols = Math.floor(colorScale.invertExtent(inc)[0]);
        cols += ' – ';
        cols += Math.ceil(colorScale.invertExtent(inc)[1]);
        legendRanges.push(cols);
      }
      var colList = _.flatten([zeroColor, colors]);
      var colorObj = _.zipObject(legendRanges, colList);
      var getHeatmapColor = vis._attr.getHeatmapColor = function (val) {
        return colorObj[val];
      };

      return new Handler(vis, {
        data: data,
        legend: new Legend(vis, vis.el, vis._attr.legendRanges, vis._attr.getHeatmapColor, vis._attr),
        axisTitle: new AxisTitle(vis.el, data.get('xAxisLabel'), data.get('yAxisLabel')),
        chartTitle: new ChartTitle(vis.el)
      });
    };
  };
});
