define(function (require) {
  return function ColumnChartUtilService(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var classify = Private(require('components/vislib/components/Legend/classify'));

    return function (self) {
      // Attributes
      var $elem = $(self.chartEl);
      var data = self.chartData;

      var margin = self._attr.margin;
      var elWidth = self._attr.width = $elem.width();
      var elHeight = self._attr.height = $elem.height();
      var offset = self._attr.offset;
      var isTooltip = self._attr.addTooltip;

      // Inherited functions
      var color = self.vis.data.color;
      var tooltip = self.vis.tooltip;

      // d3 Functions
      var yScale = self.vis.yAxis.yScale;
      var xScale = self.vis.xAxis.xScale;
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

      // Unassigned variables
      var svg;
      var width;
      var height;
      var layers;

      return d3.select(self.chartEl).call(function () {

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
        var svg = d3.select(self.chartEl).append('svg')
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
        bars.exit()
          .remove();

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
});
