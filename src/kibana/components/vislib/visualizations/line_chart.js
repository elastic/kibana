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
        color: this.vis.data.getColorFunc(),
        interpolate: 'linear',
        offset: 'zero',
        xValue: function (d, i) { return d.x; },
        yValue: function (d, i) { return d.y; },
        dispatch: d3.dispatch('brush', 'click', 'hover', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout'),
        line: d3.svg.line()
          .interpolate(this.interpolate)
          .x(this.xValue)
          .y(this.yValue),
        stack: this._attr.stack.offset(this.offset)
      });
    }

    LineChart.prototype.addCircles = function (svg, layers) {
      var color = this._attr.color;
      var xScale = this.vis.xAxis.xScale;
      var yScale = this.vis.yAxis.yScale;
      var layer;
      var circle;

      layer = svg.selectAll('.layer')
        .data(layers)
        .enter()
        .append('g')
        .attr('class', function (d) {
          return this.classify(color(d.label));
        })
        .attr('stroke', function (d) {
          return color(d.label);
        });

      circle = layer.selectAll('.point')
        .data(function (d) { return d.values; })
        .enter()
        .append('circle')
        .attr('class', function (d) {
          return this.classify(color(d.label));
        })
        .attr('fill', 'none')
        .attr('stroke', function (d) {
          return color(d.label);
        })
        .attr('stroke-width', 3)
        .attr('cx', function (d) {
          return xScale(d.x);
        })
        .attr('cy', function (d) {
          return yScale(d.y);
        })
        .attr('r', 8);

      return layer;
    };

    LineChart.prototype.addLines = function (svg, layers) {
      var color = this._attr.color;
      var lines;

      lines = svg.selectAll('.lines')
        .data(layers)
        .enter()
        .append('g')
        .attr('class', 'lines');

      lines.append('path')
        .attr('class', function (d) {
          return this.classify(color(d.label));
        })
        .attr('d', function (d) {
          return this.line(d.values);
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
      var layers;
      var lines;

      return function (selection) {
        selection.each(function (data) {
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

          // add bars
          lines = self.addLines(svg, layers);

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

  };
});