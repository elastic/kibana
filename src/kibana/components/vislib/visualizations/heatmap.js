define(function (require) {
  return function HeatMapFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');
    require('css!components/vislib/styles/main');

    /**
     * HeatMap Visualization: renders arrays of rectangles to display dense data
     *
     * @class HeatMap
     * @constructor
     * @extends Chart
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param chartData {Object} Elasticsearch query results for this specific chart
     */
    _(HeatMap).inherits(Chart);
    function HeatMap(handler, chartEl, chartData) {
      if (!(this instanceof HeatMap)) {
        return new HeatMap(handler, chartEl, chartData);
      }

      HeatMap.Super.apply(this, arguments);
    }

    /**
     * Renders heatmap chart
     *
     * @method draw
     * @param selection
     * @return {Function} Creates the heatmap
     */
    HeatMap.prototype.draw = function () {
      var self = this;
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var minWidth = 60;
      var minHeight = 60;

      return function (selection) {

        selection.each(function (data) {

          var valRange = self._attr.valRange = _.chain(data.series)
            .pluck('values')
            .flatten()
            .pluck('y')
            .without(0)
            .value();
          var valExtents = self._attr.valExtents = [_.min(valRange), _.max(valRange)];
          //console.log(valRange);
          //console.log(valExtents);

          var colors = ['#d1e8c9', '#9fda9a', '#5dcb6c', '#2fa757', '#1f7f52', '#125946'];
          function quantizeColor(val) {
            var colorScale = d3.scale.quantize()
              .range(_.range(colors.length))
              .domain(self._attr.valExtents);
            return colors[colorScale(val)];
          }
          function quantileColor(val) {
            var colorScale = d3.scale.quantile()
              .range(colors)
              .domain(self._attr.valRange);
            return colorScale(val);
          }

          var width = elWidth;
          var height = elHeight - margin.top - margin.bottom;
          var widthN = data.series[0].values.length;
          var heightN = data.series.length;
          // make gap and radius configurable
          // and remove stroke for crisper render
          var gap = 1;
          var radius = 1;
          var gridWidth = Math.floor(width / widthN);
          var gridHeight = Math.floor(height / heightN);
          var cellWidth = gridWidth - gap;
          var cellHeight = gridHeight - gap;

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          var div = d3.select(this);

          var svg = div.append('svg')
          .attr('width', width)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(0,' + margin.top + ')');

          var layer = svg.selectAll('.layer')
          .data(data.series)
          .enter()
          .append('g')
          .attr('class', function (d) {
            return d.label;
          });

          var heatMap = layer.selectAll('.heat')
          .data(function (d, i) {
            d.values.forEach(function (obj) {
              obj.labelIndex = i;
            });
            return d.values;
          })
          .enter()
          .append('rect')
          .attr('x', function (d, i) { return (i) * gridWidth; })
          .attr('y', function (d) { return (d.labelIndex) * gridHeight; })
          .attr('rx', radius)
          .attr('ry', radius)
          .attr('class', 'rect bordered')
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .style('fill', function (d) {
            if (d.y !== 0) {
              return quantileColor(d.y);
            }
            return '#f2f2f2';
          });

          return svg;
        });
      };
    };

    return HeatMap;
  };
});