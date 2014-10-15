define(function (require) {
  return function AreaChartFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');
    require('css!components/vislib/styles/main');

    /**
     * Area chart visualization
     *
     * @class AreaChart
     * @constructor
     * @extends Chart
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param chartData {Object} Elasticsearch query results for this specific
     * chart
     */
    _(AreaChart).inherits(Chart);
    function AreaChart(handler, chartEl, chartData) {
      if (!(this instanceof AreaChart)) {
        return new AreaChart(handler, chartEl, chartData);
      }

      AreaChart.Super.apply(this, arguments);

      var raw;
      var fieldIndex;

      if (handler.data.data.raw) {
        raw = handler.data.data.raw.columns;
        fieldIndex = _.findIndex(raw, {'categoryName': 'group'});
      }

      this.fieldFormatter = raw && raw[fieldIndex] ? raw[fieldIndex].field.format.convert : function (d) { return d; };
      this._attr = _.defaults(handler._attr || {}, {

        xValue: function (d) { return d.x; },
        yValue: function (d) { return d.y; }
      });
    }

    // Stack data
    // TODO: refactor so that this is called from the data module
    AreaChart.prototype.stackData = function (data) {
      var self = this;
      var stack = this._attr.stack;

      return stack(data.series.map(function (d) {
        var label = d.label;
        return d.values.map(function (e, i) {
          return {
            label: label,
            x: self._attr.xValue.call(d.values, e, i),
            y: self._attr.yValue.call(d.values, e, i)
          };
        });
      }));
    };

    AreaChart.prototype.addPath = function (svg, layers) {
      var self = this;
      var ordered = this.handler.data.get('ordered');
      var isTimeSeries = (ordered && ordered.date);
      var isOverlapping = (self._attr.mode === 'overlap');
      var color = this.handler.data.getColorFunc();
      var xScale = this.handler.xAxis.xScale;
      var yScale = this.handler.yAxis.yScale;
      var height = yScale.range()[0];

      var area = d3.svg.area()
        .x(function (d) {
          if (isTimeSeries) {
            return xScale(d.x);
          }
          return xScale(d.x) + xScale.rangeBand() / 2;
        })
        .y0(function (d) {
          if (isOverlapping) {
            return height;
          }
          return yScale(d.y0);
        })
        .y1(function (d) {
          if (isOverlapping) {
            return yScale(d.y);
          }
          return yScale(d.y0 + d.y);
        });

      var layer;
      var path;

      // Data layers
      layer = svg.selectAll('.layer')
        .data(layers)
        .enter().append('g')
        .attr('class', function (d, i) {
          return i;
        });

      // Append path
      path = layer.append('path')
      .attr('class', function (d) {
        return self.colorToClass(color(self.fieldFormatter(d[0].label)));
      })
      .style('fill', function (d) {
        return color(self.fieldFormatter(d[0].label));
      });

      // update
      path.attr('d', function (d) {
        return area(d);
      });

      return path;
    };

    AreaChart.prototype.addCircleEvents = function (circles) {
      var events = this.events;
      var dispatch = this.events._attr.dispatch;

      circles
        .on('mouseover.circle', function mouseOverCircle(d, i) {
          var circle = this;

          d3.select(circle)
            .classed('hover', true)
            .style('stroke', '#333')
            .style('cursor', 'pointer')
            .style('opacity', 1);

          dispatch.hover(events.eventResponse(d, i));
          d3.event.stopPropagation();
        })
        .on('click.circle', function clickCircle(d, i) {
          dispatch.click(events.eventResponse(d, i));
          d3.event.stopPropagation();
        })
        .on('mouseout.circle', function mouseOutCircle() {
          var circle = this;

          d3.select(circle)
            .classed('hover', false)
            .style('stroke', null)
            .style('opacity', 0);
        });
    };

    AreaChart.prototype.addCircles = function (svg, data) {
      var self = this;
      var color = this.handler.data.getColorFunc();
      var xScale = this.handler.xAxis.xScale;
      var yScale = this.handler.yAxis.yScale;
      var ordered = this.handler.data.get('ordered');
      var circleRadius = 4;
      var circleStrokeWidth = 1;
      var tooltip = this.tooltip;
      var isTooltip = this._attr.addTooltip;
      var isOverlapping = (this._attr.mode === 'overlap');
      var layer;
      var circles;

      layer = svg.selectAll('.points')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'points');

      // Append the bars
      circles = layer
        .selectAll('rect')
        .data(function appendData(d) {
          return d;
        });

      // exit
      circles
        .exit()
        .remove();

      // enter
      circles
        .enter()
        .append('circle')
        .attr('class', function circleClass(d) {
          return d.label;
        })
        .attr('fill', function (d) {
          return color(self.fieldFormatter(d.label));
        })
        .attr('stroke', function strokeColor(d) {
          return color(self.fieldFormatter(d.label));
        })
        .attr('stroke-width', circleStrokeWidth);

      // update
      circles
        .attr('cx', function cx(d) {
          if (ordered && ordered.date) {
            return xScale(d.x);
          }
          return xScale(d.x) + xScale.rangeBand() / 2;
        })
        .attr('cy', function cy(d) {
          if (isOverlapping) {
            return yScale(d.y);
          }
          return yScale(d.y0 + d.y);
        })
        .attr('r', circleRadius)
        .style('opacity', 0);

      // Add tooltip
      if (isTooltip) {
        circles.call(tooltip.render());
      }

      return circles;
    };

    AreaChart.prototype.addClipPath = function (svg, width, height) {
      // Prevents circles from being clipped at the top of the chart
      var clipPathBuffer = 5;
      var startX = 0;
      var startY = 0 - clipPathBuffer;
      var id = 'chart-area' + _.uniqueId();

      // Creating clipPath
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

    AreaChart.prototype.draw = function () {
      // Attributes
      var self = this;
      var xScale = this.handler.xAxis.xScale;
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var minWidth = 20;
      var minHeight = 20;
      var div;
      var svg;
      var width;
      var height;
      var layers;
      var circles;
      var path;

      return function (selection) {
        selection.each(function (data) {
          // Stack data
          layers = self.stackData(data);

          // Get the width and height
          width = elWidth;
          height = elHeight - margin.top - margin.bottom;

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          // Select the current DOM element
          div = d3.select(this);

          // Create the canvas for the visualization
          svg = div.append('svg')
            .attr('width', width)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(0,' + margin.top + ')');

          // add clipPath to hide circles when they go out of bounds
          self.addClipPath(svg, width, height);

          // addBrush canvas
          self.events.addBrush(xScale, svg);

          // add path
          path = self.addPath(svg, layers);

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

    return AreaChart;
  };
});
