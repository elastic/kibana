define(function (require) {
  return function LineChartFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');
    var errors = require('errors');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    require('css!components/vislib/styles/main');

    /**
     * Line Chart Visualization
     *
     * @class LineChart
     * @constructor
     * @extends Chart
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param chartData {Object} Elasticsearch query results for this specific chart
     */
    _(LineChart).inherits(Chart);
    function LineChart(handler, chartEl, chartData) {
      if (!(this instanceof LineChart)) {
        return new LineChart(handler, chartEl, chartData);
      }

      LineChart.Super.apply(this, arguments);

      // Line chart specific attributes
      this._attr = _.defaults(handler._attr || {}, {
        interpolate: 'linear',
        xValue: function (d) { return d.x; },
        yValue: function (d) { return d.y; }
      });
    }

    /**
     * Adds Events to SVG circle
     *
     * @method addCircleEvents
     * @param element{D3.UpdateSelection} Reference to SVG circle
     * @returns {D3.Selection} SVG circles with event listeners attached
     */
    LineChart.prototype.addCircleEvents = function (element, svg) {
      var events = this.events;
      var isBrushable = events.isBrushable();
      var brush = isBrushable ? events.addBrushEvent(svg) : undefined;
      var hover = events.addHoverEvent();
      var click = events.addClickEvent();
      var attachedEvents = element.call(hover).call(click);

      if (isBrushable) {
        attachedEvents.call(brush);
      }

      return attachedEvents;
    };

    /**
     * Adds circles to SVG
     *
     * @method addCircles
     * @param svg {HTMLElement} SVG to which rect are appended
     * @param data {Array} Array of object data points
     * @returns {D3.UpdateSelection} SVG with circles added
     */
    LineChart.prototype.addCircles = function (svg, data) {
      var self = this;
      var color = this.handler.data.getColorFunc();
      var xScale = this.handler.xAxis.xScale;
      var yScale = this.handler.yAxis.yScale;
      var ordered = this.handler.data.get('ordered');
      var circleRadius = 4;
      var circleStrokeWidth = 1;
      var tooltip = this.tooltip;
      var isTooltip = this._attr.addTooltip;
      var layer;
      var circles;

      layer = svg.selectAll('.points')
      .data(data)
      .enter()
        .append('g')
        .attr('class', 'points line');

      circles = layer
      .selectAll('rect')
      .data(function appendData(d) {
        return d;
      });

      circles
      .exit()
      .remove();

      circles
      .enter()
        .append('circle')
        .attr('class', function circleClass(d) {
          return self.colorToClass(color(d.label));
        })
        .attr('fill', function (d) {
          return color(d.label);
        })
        .attr('stroke', function strokeColor(d) {
          return color(d.label);
        })
        .attr('stroke-width', circleStrokeWidth);

      circles
      .attr('cx', function cx(d) {
        if (ordered && ordered.date) {
          return xScale(d.x);
        }
        return xScale(d.x) + xScale.rangeBand() / 2;
      })
      .attr('cy', function cy(d) {
        return yScale(d.y);
      })
      .attr('r', circleRadius);

      if (isTooltip) {
        circles.call(tooltip.render());
      }

      return circles;
    };

    /**
     * Adds path to SVG
     *
     * @method addLines
     * @param svg {HTMLElement} SVG to which path are appended
     * @param data {Array} Array of object data points
     * @returns {D3.UpdateSelection} SVG with paths added
     */
    LineChart.prototype.addLines = function (svg, data) {
      var self = this;
      var xScale = this.handler.xAxis.xScale;
      var yScale = this.handler.yAxis.yScale;
      var xAxisFormatter = this.handler.data.get('xAxisFormatter');
      var color = this.handler.data.getColorFunc();
      var ordered = this.handler.data.get('ordered');
      var interpolate = this._attr.interpolate;
      var line = d3.svg.line()
      .interpolate(interpolate)
      .x(function x(d) {
        if (ordered && ordered.date) {
          return xScale(d.x);
        }
        return xScale(d.x) + xScale.rangeBand() / 2;
      })
      .y(function y(d) {
        return yScale(d.y);
      });
      var lines;

      lines = svg
      .selectAll('.lines')
      .data(data)
      .enter()
        .append('g')
        .attr('class', 'lines');

      lines.append('path')
      .attr('class', function lineClass(d) {
        return self.colorToClass(color(d.label));
      })
      .attr('d', function lineD(d) {
        return line(d.values);
      })
      .attr('fill', 'none')
      .attr('stroke', function lineStroke(d) {
        return color(d.label);
      })
      .attr('stroke-width', 2);

      return lines;
    };

    /**
     * Adds SVG clipPath
     *
     * @method addClipPath
     * @param svg {HTMLElement} SVG to which clipPath is appended
     * @param width {Number} SVG width
     * @param height {Number} SVG height
     * @returns {D3.UpdateSelection} SVG with clipPath added
     */
    LineChart.prototype.addClipPath = function (svg, width, height) {
      var clipPathBuffer = 5;
      var startX = 0;
      var startY = 0 - clipPathBuffer;
      var id = 'chart-area' + _.uniqueId();

      return svg
      .attr('clip-path', 'url(#' + id + ')')
      .append('clipPath')
      .attr('id', id)
      .append('rect')
      .attr('x', startX)
      .attr('y', startY)
      .attr('width', width)
      // Adding clipPathBuffer to height so it doesn't
      // cutoff the lower part of the chart
      .attr('height', height + clipPathBuffer);
    };

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the line chart
     */
    LineChart.prototype.draw = function () {
      var self = this;
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var xScale = this.handler.xAxis.xScale;
      var chartToSmallError = 'The height and/or width of this container is too small for this chart.';
      var minWidth = 20;
      var minHeight = 20;
      var startLineX = 0;
      var lineStrokeWidth = 1;
      var div;
      var svg;
      var width;
      var height;
      var lines;
      var circles;

      return function (selection) {
        selection.each(function (data) {
          var el = this;

          var layers = data.series.map(function mapSeries(d) {
            var label = d.label;
            return d.values.map(function mapValues(e, i) {
              return {
                _input: e,
                label: label,
                x: self._attr.xValue.call(d.values, e, i),
                y: self._attr.yValue.call(d.values, e, i)
              };
            });
          });

          width = elWidth - margin.left - margin.right;
          height = elHeight - margin.top - margin.bottom;

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          div = d3.select(el);

          svg = div.append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          self.addClipPath(svg, width, height);
          lines = self.addLines(svg, data.series);
          circles = self.addCircles(svg, layers);
          self.addCircleEvents(circles, svg);

          var line = svg
          .append('line')
          .attr('x1', startLineX)
          .attr('y1', height)
          .attr('x2', width)
          .attr('y2', height)
          .style('stroke', '#ddd')
          .style('stroke-width', lineStrokeWidth);

          return svg;
        });
      };
    };

    return LineChart;
  };
});
