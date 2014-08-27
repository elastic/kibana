define(function (require) {
  return function ColumnChartFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/modules/_chart'));
    var classify = Private(require('components/vislib/components/Legend/classify'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    _(ColumnChart).inherits(Chart);
    function ColumnChart(vis, chartEl, chartData) {
      if (!(this instanceof ColumnChart)) {
        return new ColumnChart(vis, chartEl, chartData);
      }

      ColumnChart.Super.apply(this, arguments);
      this._attr = _.defaults(vis._attr || {}, {
        offset: 'zero',
        xValue: function (d, i) { return d.x; },
        yValue: function (d, i) { return d.y; },
        dispatch: d3.dispatch('brush', 'click', 'hover', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout'),
        stack: d3.layout.stack()
          .x(function (d) { return d.x; })
          .y(function (d) { return d.y; })
          .offset(this.offset)
      });
    }

    ColumnChart.prototype.eventResponse = function (d, i) {
      return {
        value     : this._attr.yValue(d, i),
        point     : d,
        label     : d.label,
        color     : this.vis.data.getColorFunc()(d.label),
        pointIndex: i,
        series    : this.chartData.series,
        config    : this._attr,
        data      : this.chartData,
        e         : d3.event
      };
    };

    ColumnChart.prototype.stackData = function (data) {
      var self = this;

      return this._attr.stack(data.series.map(function (d) {
        var label = d.label;
        return d.values.map(function (e, i) {
          return {
            label: label,
            x    : self._attr.xValue.call(d.values, e, i),
            y    : self._attr.yValue.call(d.values, e, i)
          };
        });
      }));
    };

    ColumnChart.prototype.addBrush = function (xScale, svg) {
      var self = this;

      var brush = d3.svg.brush()
        .x(xScale)
        .on('brushend', function brushEnd() {
          return self._attr.dispatch.brush({
            range: brush.extent(),
            config: self._attr,
            e: d3.event,
            data: self.chartData
          });
        });

      if (self._attr.addEvents) {
        svg.append('g')
          .attr('class', 'brush')
          .call(brush)
          .selectAll('rect')
          .attr('height', this._attr.height - this._attr.margin.top - this._attr.margin.bottom);
      }
    };

    ColumnChart.prototype.draw = function () {
      // Attributes
      var self = this;
      var color = this.vis.data.getColorFunc();
      var tooltip = this.vis.tooltip;
      var yScale = this.vis.yAxis.yScale;
      var xScale = this.vis.xAxis.xScale;
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var isTooltip = this._attr.addTooltip;
      var addEvents = this._attr.addEvents;
      var dispatch = this._attr.dispatch;
      var div;
      var svg;
      var width;
      var height;
      var layers;
      var layer;
      var bars;

      return function (selection) {
        selection.each(function (data) {
          if (!yScale) {
            throw new Error('yScale is ' + yScale);
          }

          if (!xScale) {
            throw new Error('xScale is ' + xScale);
          }

          layers = self.stackData(data);

          self.validateHeightAndWidth($elem, elWidth, elHeight);

          // Get the width and height
          width = elWidth - margin.left - margin.right;
          height = elHeight - margin.top - margin.bottom;

          // Create the canvas for the visualization
          div = d3.select(this);

          svg = div.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          self.addBrush(xScale, svg);

          // Data layers
          layer = svg.selectAll('.layer')
            .data(layers)
            .enter().append('g')
            .attr(
            'class', function (d, i) {
              return i;
            });

          // Append the bars
          bars = layer.selectAll('rect')
            .data(
            function (d) {
              return d;
            });

          // exit
          bars.exit().remove();

          // enter
          bars.enter()
            .append('rect')
            .attr(
            'class', function (d) {
              return 'color ' + classify(color(d.label));
            })
            .attr(
            'fill', function (d) {
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

          bars
            .on('mouseover.bar', function (d, i) {
              if (addEvents) {
                d3.select(this)
                  .classed('hover', true)
                  .style('stroke', '#333')
                  .style('cursor', 'pointer');

                dispatch.hover(self.eventResponse(d, i));
                d3.event.stopPropagation();
              }
            })
            .on('click.bar', function (d, i) {
              if (addEvents) {
                dispatch.click(self.eventResponse(d, i));
                d3.event.stopPropagation();
              }
            })
            .on('mouseout.bar', function () {
              d3.select(this).classed('hover', false)
                .style('stroke', null);
            });

          // chart base line
          var line = svg.append('line')
          .attr('x1', 0)
          .attr('y1', height)
          .attr('x2', width)
          .attr('y2', height)
          .style('stroke', '#ddd')
          .style('stroke-width', 1);

          // Add tooltip
          if (isTooltip) {
            bars.call(tooltip.render());
          }

          return svg;
        });
      };
    };
    return ColumnChart;
  };
});