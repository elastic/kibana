define(function (require) {
  return function ColumnChartUtilService(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var orderKeys = Private(require('components/vislib/components/_functions/zero_injection/ordered_x_keys'));
    var classify = Private(require('components/vislib/components/Legend/classify'));
    var createSVG = Private(require('components/vislib/components/_functions/d3/_create_svg'));
    var transformSVG = Private(require('components/vislib/components/_functions/d3/_transform_svg'));
    var appendYAxis = Private(require('components/vislib/components/_functions/d3/_append_y_axis'));
    var getYStackMax = Private(require('components/vislib/components/_functions/d3/_y_stack_max'));

    return function (that) {

      // Attributes
      var $elem = $('.chart');
      var callXAxis = that.callXAxis(that);
      var callYAxis = that.callYAxis(that);
      var margin = that._attr.margin;
      var elWidth = that._attr.width = $elem.width();
      var elHeight = that._attr.height = $elem.height();
      var offset = that._attr.offset;
      var focusOpacity = that._attr.focusOpacity;
      var blurredOpacity = that._attr.blurredOpacity;
      var defaultOpacity = that._attr.defaultOpacity;
      var isTooltip = that._attr.addTooltip;

      // Inherited functions
      var color = that.color;
//      var tooltip = that.tooltip;
      var injectZeros = that.injectZeros;
//      var getYStackMax = that.yStackMax;
      var yMax;
//      var createSVG = that.createSVG;
//      var transformSVG = that.transformSVG;
//      var appendXAxis = that.appendXAxis;
//      var appendYAxis = that.appendYAxis;

      // d3 Functions
      var yScale = d3.scale.linear();
      var xScale = d3.scale.ordinal();
      var xAxis = d3.svg.axis().orient('bottom');
      var yAxis = d3.svg.axis().orient('left');
//      var xTickScale = d3.scale.linear()
//        .clamp(true)
//        .domain([80, 300, 800])
//        .range([0, 2, 4]);
//      var yTickScale = d3.scale.linear()
//        .clamp(true)
//        .domain([20, 40, 1000])
//        .range([0, 2, 10]);
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
      var brush = d3.svg.brush();

      // Unassigned variables
      var svg;
      var width;
      var height;
      var zeroFilledData;
      var layers;
      var yStackMax;
      var xTicks;
      var yTicks;

      return function (selection) {
        selection.each(function (data) {
          zeroFilledData = injectZeros(data.series, data.ordered);

          layers = stack(zeroFilledData.map(function (d, i) {
            var label = d.label;
            return d.values.map(function (e, i) {
              return {
                label: label,
                x: xValue.call(d.values, e, i),
                y: yValue.call(d.values, e, i)
              };
            });
          }));

          yStackMax = getYStackMax(layers);

          // Get the width and height
          width = elWidth - margin.left - margin.right;
          height = elHeight - margin.top - margin.bottom;

          // Get the number of axis ticks
//          xTicks = Math.floor(xTickScale(width));
//          yTicks = Math.floor(yTickScale(height));

          // Update the xScale
          xScale.domain(orderKeys(zeroFilledData)) // May always return strings - need to add new function that returns the correct values
            .rangeBands([0, width], 0.1);

          // Update the yScale
//          yScale = getYDomain()
          yScale
            .domain([0, yStackMax])
            .range([height, 0]);

          // Update the Axes
          xAxis.scale(xScale)
//          .tickValues(xScale.domain().filter(function (d, i) {
//            if (i % 5 === 0) {
//              return true;
//            }
//            return false;
//          }))
            .tickFormat(data.xAxisFormatter);

          yAxis.scale(yScale);

//          brush.x(xScale);

          // Create the canvas for the visualization
          var svg = createSVG(this, width, height);
          transformSVG(svg, margin.left, margin.top);

          // x axis
//          d3.select('.x-axis-wrapper').call(callXAxis.draw(xAxis));
//          checkSize();
//          appendXAxis(svg, height, xAxis);

          d3.select('.y-axis-col').call(callYAxis.draw(yAxis));
          // y axis
//          appendYAxis(svg, yAxis)
//            .append('text')
//            .attr('transform', 'rotate(-90)')
//            .attr('x', -height / 2)
//            .attr('y', -40)
//            .attr('dy', '.71em')
//            .style('text-anchor', 'middle')
//            .text(data.yAxisLabel);

          // Chart title
          svg.append('text')
            .attr('class', 'charts-label')
            .attr('text-anchor', 'middle')
            .attr('x', width / 2)
            .attr('y', -10)
            .text(data.label);

          // Data layers
          var layer = svg.selectAll('.layer')
            .data(layers)
            .enter()
            .append('g')
            .attr(
            'class', function (d, i) {
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
            });

//          // Add tooltip
//          if (isTooltip) {
//            bars.call(tooltip.draw);
//          }

          return svg;
        });
      };
    };
  };
});
