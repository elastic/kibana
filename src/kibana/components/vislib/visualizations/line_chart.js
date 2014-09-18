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

    // Response to `click` and `hover` events
    LineChart.prototype.eventResponse = function (d, i) {
      return {
        value: this._attr.yValue(d, i),
        point: d,
        label: d.label,
        color: this.vis.data.getColorFunc()(d.label),
        pointIndex: i,
        series: this.chartData.series,
        config: this._attr,
        data: this.chartData,
        e: d3.event
      };
    };

    LineChart.prototype.addCircleEvents = function (circles) {
      var self = this;
      var tooltip = this.vis.tooltip;
      var isTooltip = this._attr.addTooltip;
      var dispatch = this._attr.dispatch;

      circles
        .on('mouseover.circle', function (d, i) {
          d3.select(this)
            .classed('hover', true)
            .style('stroke', '#333')
            .style('cursor', 'pointer');

          dispatch.hover(self.eventResponse(d, i));
          d3.event.stopPropagation();
        })
        .on('click.circle', function (d, i) {
          dispatch.click(self.eventResponse(d, i));
          d3.event.stopPropagation();
        })
        .on('mouseout.circle', function () {
          d3.select(this).classed('hover', false)
            .style('stroke', null);
        });

      // Add tooltip
      if (isTooltip) {
        circles.call(tooltip.render());
      }
    };

    // Add brush to the svg
    LineChart.prototype.addBrush = function (xScale, svg) {
      var self = this;

      // Brush scale
      var brush = d3.svg.brush()
        .x(xScale)
        .on('brushend', function brushEnd() {
          // response returned on brush
          return self._attr.dispatch.brush({
            range: brush.extent(),
            config: self._attr,
            e: d3.event,
            data: self.chartData
          });
        });

      // if `addBrushing` is true, add brush canvas
      if (self._attr.addBrushing) {
        svg.append('g')
          .attr('class', 'brush')
          .call(brush)
          .selectAll('rect')
          .attr('height', this._attr.height - this._attr.margin.top - this._attr.margin.bottom);
      }
    };

    LineChart.prototype.addCircles = function (svg, data) {
      var self = this;
      var color = this.vis.data.getColorFunc();
      var xScale = this.vis.xAxis.xScale;
      var yScale = this.vis.yAxis.yScale;
      var ordered = this.vis.data.get('ordered');
      var layer;
      var circles;

      layer = svg.selectAll('.points')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'points');

      // Append the bars
      circles = layer.selectAll('rect')
        .data(function (d) {
          return d;
        });

      // exit
      circles.exit().remove();

      // enter
      circles.enter()
        .append('circle')
        .attr('class', function (d) {
          return self.colorToClass(color(d.label));
        })
        .attr('fill', 'none')
        .attr('stroke', function (d) {
          return color(d.label);
        })
        .attr('stroke-width', 1);

      circles
        .attr('cx', function (d) {
          if (ordered && ordered.date) {
            return xScale(d.x);
          }
          return xScale(d.x) + xScale.rangeBand() / 2;
        })
        .attr('cy', function (d) {
          return yScale(d.y);
        })
        .attr('r', 4);

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
          if (ordered && ordered.date) {
            return xScale(d.x);
          }
          return xScale(d.x) + xScale.rangeBand() / 2;
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
        .attr('stroke-width', 2);

      return lines;
    };

    LineChart.prototype.addClipPath = function (svg, width, height) {
      // Creating clipPath
      return svg.attr('clip-path', 'url(#chart-area)')
        .append('clipPath')
        .attr('id', 'chart-area')
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height);
    };

    LineChart.prototype.draw = function () {
      // Attributes
      var self = this;
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var xScale = this.vis.xAxis.xScale;
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
                x: self._attr.xValue.call(d.values, e, i),
                y: self._attr.yValue.call(d.values, e, i)
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

          // add clipPath to hide circles when they go out of bounds
          self.addClipPath(svg, width, height);

          // addBrush canvas
          self.addBrush(xScale, svg);

          // add lines
          lines = self.addLines(svg, data.series);

          // add circles
          circles = self.addCircles(svg, layers);

          // add click and hover events to circles
          self.addCircleEvents(circles);

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