define(function (require) {
  return function HistogramChartFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/modules/_chart'));
    var classify = Private(require('components/vislib/components/Legend/classify'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    _(ColumnChart).inherits(Chart);
    function ColumnChart(vis, chartEl, chartData) {
      ColumnChart.Super.apply(this, arguments);
      this._attr = _.defaults(vis.config || {}, {
        'margin' : { top: 0, right: 0, bottom: 0, left: 0 },
        'offset' : 'zero'
      });
    }

    ColumnChart.prototype.draw = function () {
      // Attributes
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var offset = this._attr.offset;
      var isTooltip = this._attr.addTooltip;
      var color = this.vis.data.color;
      var tooltip = this.vis.tooltip;
      var yScale = this.vis.yAxis.yScale;
      var xScale = this.vis.xAxis.xScale;
      var stack = d3.layout.stack()
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .offset(offset);
      var xValue = function (d, i) {
        return d.x;
      };
      var yValue = function (d, i) {
        return d.y;
      };
      var div;
      var svg;
      var width;
      var height;
      var layers;

      return function (selection) {
        selection.each(function (data) {

          layers = stack(data.series.map(function (d) {
            var label = d.label;
            return d.values.map(function (e, i) {
              return {
                label: label,
                x: xValue.call(d.values, e, i),
                y: yValue.call(d.values, e, i)
              };
            });
          }));

          if (elWidth <= 0 || elHeight <= 0) {
            throw new Error($elem.attr('class') + ' height is ' + elHeight + ' and width is ' + elWidth);
          }

          // Get the width and height
          width = elWidth - margin.left - margin.right;
          height = elHeight - margin.top - margin.bottom;

          // Create the canvas for the visualization
          var div = d3.select(this);

          var svg = div.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          // Data layers
          var layer = svg.selectAll('.layer')
            .data(layers)
            .enter().append('g')
            .attr('class', function (d, i) {
              return i;
            });

          // Append the bars
          var bars = layer.selectAll('rect')
            .data(function (d) {
              return d;
            });

          // exit
          bars.exit().remove();

          // enter
          bars.enter()
            .append('rect')
            .attr('class', function (d) {
              return 'color ' + classify(color(d.label));
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
              return xScale.rangeBand();
            })
            .attr('y', function (d) {
              return yScale(d.y0 + d.y);
            })
            .attr('height', function (d) {
              return yScale(d.y0) - yScale(d.y0 + d.y);
            })

            .on('mouseover.bar', function (d, i) {
              d3.select(this)
                .classed('hover', true)
                .style('stroke', '#333');
            })
            .on('mouseout.bar', function (d) {
              d3.select(this)
                .classed('hover', false)
                .style('stroke', null);
            });

          // chart base line
//        var line = svg.append('line')
//          .attr('x1', 0)
//          .attr('y1', height)
//          .attr('x2', width)
//          .attr('y2', height)
//          .style('stroke', '#848e96')
//          .style('stroke-width', 1);

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