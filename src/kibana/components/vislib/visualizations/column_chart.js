define(function (require) {
  return function ColumnChartFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');
    require('css!components/vislib/styles/main');

    /**
     * Vertical Bar Chart Visualization: renders vertical and/or stacked bars
     *
     * @class ColumnChart
     * @constructor
     * @extends Chart
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param chartData {Object} Elasticsearch query results for this specific chart
     */
    _(ColumnChart).inherits(Chart);
    function ColumnChart(handler, chartEl, chartData) {
      if (!(this instanceof ColumnChart)) {
        return new ColumnChart(handler, chartEl, chartData);
      }

      ColumnChart.Super.apply(this, arguments);

      // Column chart specific attributes
      this._attr = _.defaults(handler._attr || {}, {
        xValue: function (d) { return d.x; },
        yValue: function (d) { return d.y; }
      });
    }

    /**
     * Stacks chart data values
     *
     * @method stackData
     * @param data {Object} Elasticsearch query result for this chart
     * @returns {Array} Stacked data objects with x, y, and y0 values
     */
    // TODO: refactor so that this is called from the data module
    ColumnChart.prototype.stackData = function (data) {
      var self = this;

      return this._attr.stack(data.series.map(function (d) {
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

    /**
     * Adds SVG rect to Vertical Bar Chart
     *
     * @method addBars
     * @param svg {HTMLElement} SVG to which rect are appended
     * @param layers {Array} Chart data array
     * @returns {D3.UpdateSelection} SVG with rect added
     */
    ColumnChart.prototype.addBars = function (svg, layers) {
      var self = this;
      var data = this.chartData;
      var color = this.handler.data.getColorFunc();
      var xScale = this.handler.xAxis.xScale;
      var yScale = this.handler.yAxis.yScale;
      var tooltip = this.tooltip;
      var isTooltip = this._attr.addTooltip;
      var layer;
      var bars;

      layer = svg.selectAll('.layer')
      .data(layers)
      .enter().append('g')
      .attr('class', function (d, i) {
        return i;
      });

      bars = layer.selectAll('rect')
      .data(function (d) {
        return d;
      });

      bars
      .exit()
      .remove();

      bars
      .enter()
      .append('rect')
        .attr('class', function (d) {
          return self.colorToClass(color(d.label));
        })
        .attr('fill', function (d) {
          return color(d.label);
        });

      bars
      .attr('x', function (d) {
        return xScale(d.x);
      })
      .attr('width', function () {
        var barWidth;
        var barSpacing;

        if (data.ordered && data.ordered.date) {
          barWidth = xScale(data.ordered.min + data.ordered.interval) - xScale(data.ordered.min);
          barSpacing = barWidth * 0.25;

          return barWidth - barSpacing;
        }
        return xScale.rangeBand();
      })
      .attr('y', function (d) {
        return yScale(d.y0 + d.y);
      })
      .attr('height', function (d) {
        return yScale(d.y0) - yScale(d.y0 + d.y);
      });

      if (isTooltip) {
        bars.call(tooltip.render());
      }

      return bars;
    };

    /**
     * Adds Events to SVG rect
     *
     * @method addBarEvents
     * @param svg {HTMLElement} chart SVG
     * @param bars {D3.UpdateSelection} SVG rect
     * @param brush {Function} D3 brush function
     * @returns {HTMLElement} rect with event listeners attached
     */
    ColumnChart.prototype.addBarEvents = function (svg, bars, brush) {
      var self = this;
      var events = this.events;
      var dispatch = this.events._attr.dispatch;
      var addBrush = this._attr.addBrushing;
      var xScale = this.handler.xAxis.xScale;

      bars
      .on('mouseover.bar', function (d, i) {
        self.mouseOverBar(this);
        dispatch.hover(events.eventResponse(d, i));
        d3.event.stopPropagation();
      })
      .on('mousedown.bar', function () {
        if (addBrush) {
          var bar = d3.select(this);
          var startX = d3.mouse(svg.node());
          var startXInv = xScale.invert(startX[0]);

          // Reset the brush value
          brush.extent([startXInv, startXInv]);

          // Magic!
          // Need to call brush on svg to see brush when brushing
          // while on top of bars.
          // Need to call brush on bar to allow the click event to be registered
          svg.call(brush);
          bar.call(brush);
        }
      })
      .on('click.bar', function (d, i) {
        dispatch.click(events.eventResponse(d, i));
        d3.event.stopPropagation();
      })
      .on('mouseout.bar', function () {
        self.mouseOutBar(this);
      });
    };

    /**
     * Mouseover Behavior
     *
     * @method mouseOverBar
     * @param that {Object} Reference to this object
     * @returns {D3.Selection} this object with '.hover' class true
     */
    ColumnChart.prototype.mouseOverBar = function (that) {
      return d3.select(that)
      .classed('hover', true)
      .style('stroke', '#333')
      .style('cursor', 'pointer');
    };

    /**
     * Mouseout Behavior
     *
     * @method mouseOutBar
     * @param that {Object} Reference to this object
     * @returns {D3.Selection} this object with '.hover' class false
     */
    ColumnChart.prototype.mouseOutBar = function (that) {
      return d3.select(that)
      .classed('hover', false)
      .style('stroke', null);
    };

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the vertical bar chart
     */
    ColumnChart.prototype.draw = function () {
      var self = this;
      var xScale = this.handler.xAxis.xScale;
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var minWidth = 20;
      var minHeight = 20;
      var isEvents = this._attr.addEvents;
      var div;
      var svg;
      var width;
      var height;
      var layers;
      var brush;
      var bars;

      return function (selection) {
        selection.each(function (data) {
          layers = self.stackData(data);

          width = elWidth;
          height = elHeight - margin.top - margin.bottom;

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          div = d3.select(this);

          svg = div.append('svg')
          .attr('width', width)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(0,' + margin.top + ')');

          brush = self.events.addBrush(xScale, svg);
          bars = self.addBars(svg, layers);

          if (isEvents) {
            self.addBarEvents(svg, bars, brush);
          }

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

    return ColumnChart;
  };
});
