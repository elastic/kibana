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
            _input: e,
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
      var color = this.handler.data.getColorFunc();
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

      self.updateBars(bars);

      // Add tooltip
      if (isTooltip) {
        bars.call(tooltip.render());
      }

      return bars;
    };

    /**
     * Determines whether bars are grouped or stacked and updates the D3
     * selection
     *
     * @method updateBars
     * @param bars {D3.UpdateSelection} SVG with rect added
     * @returns {D3.UpdateSelection}
     */
    ColumnChart.prototype.updateBars = function (bars) {
      var offset = this._attr.mode;

      if (offset === 'grouped') {
        return this.addGroupedBars(bars);
      }
      return this.addStackedBars(bars);
    };

    /**
     * Adds stacked bars to column chart visualization
     *
     * @method addStackedBars
     * @param bars {D3.UpdateSelection} SVG with rect added
     * @returns {D3.UpdateSelection}
     */
    ColumnChart.prototype.addStackedBars = function (bars) {
      var data = this.chartData;
      var xScale = this.handler.xAxis.xScale;
      var yScale = this.handler.yAxis.yScale;

      // update
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

      return bars;
    };

    /**
     * Adds grouped bars to column chart visualization
     *
     * @method addGroupedBars
     * @param bars {D3.UpdateSelection} SVG with rect added
     * @returns {D3.UpdateSelection}
     */
    ColumnChart.prototype.addGroupedBars = function (bars) {
      var xScale = this.handler.xAxis.xScale;
      var yScale = this.handler.yAxis.yScale;
      var data = this.chartData;
      var n = data.series.length;
      var height = yScale.range()[0];
      var groupSpacingPercentage = 0.15;
      var isTimeScale = (data.ordered && data.ordered.date);
      var minWidth = 1;
      var barWidth;

      // update
      bars
      .attr('x', function (d, i, j) {
        if (isTimeScale) {
          var groupWidth = xScale(data.ordered.min + data.ordered.interval) -
            xScale(data.ordered.min);
          var groupSpacing = groupWidth * groupSpacingPercentage;

          barWidth = (groupWidth - groupSpacing) / n;

          return xScale(d.x) + barWidth * j;
        }
        return xScale(d.x) + xScale.rangeBand() / n * j;
      })
      .attr('width', function () {
        if (barWidth < minWidth) {
          throw new errors.ContainerTooSmall();
        }

        if (isTimeScale) {
          return barWidth;
        }
        return xScale.rangeBand() / n;
      })
      .attr('y', function (d) {
        return yScale(d.y);
      })
      .attr('height', function (d) {
        return height - yScale(d.y);
      });

      return bars;
    };

    /**
     * Adds Events to SVG rect
     * Visualization is only brushable when a brush event is added
     * If a brush event is added, then a function should be returned.
     *
     * @method addBarEvents
     * @param element {D3.UpdateSelection} target
     * @param svg {D3.UpdateSelection} chart SVG
     * @returns {D3.Selection} rect with event listeners attached
     */
    ColumnChart.prototype.addBarEvents = function (element, svg) {
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
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the vertical bar chart
     */
    ColumnChart.prototype.draw = function () {
      var self = this;
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

          bars = self.addBars(svg, layers);

          // Adds event listeners
          self.addBarEvents(bars, svg);

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
