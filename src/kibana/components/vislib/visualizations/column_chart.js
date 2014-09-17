define(function (require) {
  return function ColumnChartFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    /*
     * Column chart visualization => vertical bars, stacked bars
     */
    _(ColumnChart).inherits(Chart);
    function ColumnChart(vis, chartEl, chartData) {
      if (!(this instanceof ColumnChart)) {
        return new ColumnChart(vis, chartEl, chartData);
      }

      ColumnChart.Super.apply(this, arguments);
      // Column chart specific attributes
      this._attr = _.defaults(vis._attr || {}, {
        xValue: function (d, i) { return d.x; },
        yValue: function (d, i) { return d.y; },
        dispatch: d3.dispatch('brush', 'click', 'hover', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout'),
      });
    }

    // Response to `click` and `hover` events
    ColumnChart.prototype.eventResponse = function (d, i) {
      return {
        value: this._attr.yValue(d, i),
        point: d,
        label: d.label,
        color: this.vis.data.getColorFunc()(d.label),
        pointIndex: i,
        series    : this.chartData.series,
        config    : this._attr,
        data      : this.chartData,
        e         : d3.event
      };
    };

    // Stack data
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

    // Add brush to the svg
    ColumnChart.prototype.addBrush = function (xScale, svg) {
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

    ColumnChart.prototype.addBars = function (svg, layers) {
      var data = this.chartData;
      var color = this.vis.data.getColorFunc();
      var xScale = this.vis.xAxis.xScale;
      var yScale = this.vis.yAxis.yScale;
      var self = this;
      var layer;
      var bars;

      // Data layers
      layer = svg.selectAll('.layer')
      .data(layers)
      .enter().append('g')
      .attr('class', function (d, i) {
        return i;
      });

      // Append the bars
      bars = layer.selectAll('rect')
      .data(function (d) {
        return d;
      });

      // exit
      bars.exit().remove();

      // enter
      bars.enter()
        .append('rect')
        .attr('class', function (d) {
          return self.colorToClass(color(d.label));
        })
        .attr('fill', function (d) {
          return color(d.label);
        });

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

    ColumnChart.prototype.addBarEvents = function (bars) {
      var self = this;
      var tooltip = this.vis.tooltip;
      var isTooltip = this._attr.addTooltip;
      var dispatch = this._attr.dispatch;

      bars
      .on('mouseover.bar', function (d, i) {
        d3.select(this)
          .classed('hover', true)
          .style('stroke', '#333')
          .style('cursor', 'pointer');

        dispatch.hover(self.eventResponse(d, i));
        d3.event.stopPropagation();
      })
      .on('click.bar', function (d, i) {
        dispatch.click(self.eventResponse(d, i));
        d3.event.stopPropagation();
      })
      .on('mouseout.bar', function () {
        d3.select(this).classed('hover', false)
          .style('stroke', null);
      });

      // Add tooltip
      if (isTooltip) {
        bars.call(tooltip.render());
      }
    };

    ColumnChart.prototype.draw = function () {
      // Attributes
      var self = this;
      var xScale = this.vis.xAxis.xScale;
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

          // addBrush canvas
          self.addBrush(xScale, svg);

          // add bars
          bars = self.addBars(svg, layers);

          // add events to bars
          self.addBarEvents(bars);

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

    return ColumnChart;
  };
});
