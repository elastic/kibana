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
          var width = elWidth;
          var height = elHeight - margin.top - margin.bottom;
          var widthN = data.series[0].values.length;
          var heightN = data.series.length;
          var gridWidth = Math.floor(width / widthN);
          var gridHeight = (height / heightN);
          var buckets = 9;
          var colors = [
            '#ffffd9',
            '#edf8b1',
            '#c7e9b4',
            '#7fcdbb',
            '#41b6c4',
            '#1d91c0',
            '#225ea8',
            '#253494',
            '#081d58'
          ];
          var colorScale = d3.scale.quantile()
          .domain([0, buckets - 1, d3.max(data.series, function (obj) {
            return d3.max(obj.values, function (d) {
              return d.y;
            });
          })])
          .range(colors);

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          var div = d3.select(this);

          var svg = div.append('svg')
          .attr('width', width)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(0,' + margin.top + ')');

          var rowLabels = svg.selectAll('.rowLabel')
            .data(data.series)
            .enter()
            .append('text')
            .text(function (d) { return d.label; })
            .attr('x', 0)
            .attr('y', function (d, i) { return i * gridHeight; })
            .style('text-anchor', 'end')
            .attr('transform', 'translate(-6,' + gridHeight / 1.5 + ')')
            .attr('class', function (d) {
              return d.label;
            });

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
          .attr('rx', 4)
          .attr('ry', 4)
          .attr('class', 'rect bordered')
          .attr('width', gridWidth)
          .attr('height', gridHeight)
          .style('fill', colors[0])
          .style('stroke', '#ddd')
          .style('stroke-width', 0.3);

          heatMap.transition().duration(1000)
          .style('fill', function (d) {
            return colorScale(d.y);
          });


          return svg;
        });
      };
    };

    return HeatMap;
  };
});
