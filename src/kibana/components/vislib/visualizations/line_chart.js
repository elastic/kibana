define(function (require) {
  return function LineChartFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/visualizations/_chart'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    _(LineChart).inherits(Chart);
    function LineChart(vis, chartEl, chartData) {
      if (!(this instanceof LineChart)) {
        return new LineChart(vis, chartEl, chartData);
      }

      LineChart.Super.apply(this, arguments);
      // Line chart specific attributes
      this._attr = _.defaults(vis._attr || {}, {
        interpolate: 'linear',
        xValue: function (d) { return d.x; },
        yValue: function (d) { return d.y; },
        dispatch: d3.dispatch('brush', 'click', 'hover', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout')
      });
    }

    LineChart.prototype.addCircles = function (svg, data) {
      var self = this;
      var color = this.vis.data.getColorFunc();
      var xScale = this.vis.xAxis.xScale;
      var yScale = this.vis.yAxis.yScale;
      var ordered = this.vis.data.get('ordered');
      var circles;
      var circle;

      circles = svg.selectAll('.points')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'points');

      circle = circles.selectAll('.point').append('circle')
        .data(function (d) { return d; })
        .enter()
        .append('circle')
        .attr('class', function (d) {
          return self.colorToClass(color(d.label));
        })
        .attr('cx', function (d) {
          if (!ordered) {
            return xScale(d.x) + xScale.rangeBand() / 2;
          }
          return xScale(d.x);
        })
        .attr('cy', function (d) {
          return yScale(d.y);
        })
        .attr('r', 8)
        .attr('fill', 'none')
        .attr('stroke', function (d) {
          return color(d.label);
        })
        .attr('stroke-width', 3);

      return circles;
    };

    LineChart.prototype.addLines = function (svg, data) {
      var self = this;
      var xScale = this.vis.xAxis.xScale;
      var yScale = this.vis.yAxis.yScale;
      var xAxisFormatter = this.vis.data.get('xAxisFormatter');
      var color = this.vis.data.getColorFunc();
      var ordered = this.vis.data.get('ordered');
      var line = d3.svg.line()
        .interpolate(this._attr.interpolate)
        .x(function (d) {
          if (!ordered) {
            return xScale(d.x) + xScale.rangeBand() / 2;
          }
          return xScale(d.x);
        })
        .y(function (d) { return yScale(d.y); });
      var lines;

      lines = svg.selectAll('.lines')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'lines');

      lines.append('path')
        .attr('class', function (d) {
          return self.colorToClass(color(d.label));
        })
        .attr('d', function (d) {
          return line(d.values);
        })
        .attr('fill', 'none')
        .attr('stroke', function (d) {
          return color(d.label);
        })
        .attr('stroke-width', 3);

      return lines;
    };

    LineChart.prototype.draw = function () {
      // Attributes
      var self = this;
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var div;
      var svg;
      var width;
      var height;
      var lines;
      var circles;

      return function (selection) {
        selection.each(function (data) {

          var layers = data.series.map(function (d) {
            var label = d.label;
            return d.values.map(function (e, i) {
              return {
                label: label,
                x    : self._attr.xValue.call(d.values, e, i),
                y    : self._attr.yValue.call(d.values, e, i)
              };
            });
          });

          // Get the width and height
          width = elWidth - margin.left - margin.right;
          height = elHeight - margin.top - margin.bottom;

          // if height or width < 20 or NaN, throw error
          if (_.isNaN(width) || width < 20 || _.isNaN(height) || height < 20) {
            throw new Error('The height and/or width of this container is too ' +
              'small for this chart.');
          }

          // Select the current DOM element
          div = d3.select(this);

          // Create the canvas for the visualization
          svg = div.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          // add lines
          lines = self.addLines(svg, data.series);
          circles = self.addCircles(svg, layers);

          // chart base line
          var line = svg.append('line')
            .attr('x1', 0)
            .attr('y1', height)
            .attr('x2', width)
            .attr('y2', height)
            .style('stroke', '#ddd')
            .style('stroke-width', 1);

          return svg;
        });
      };
    };

    return LineChart;
  };
});