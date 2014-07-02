define(function (require) {

  var _ = require('lodash');
  var $ = require('jquery');
  var d3 = require('d3');

  var getSelection = require('components/vislib/utils/selection');
  var getLegend = require('components/vislib/modules/legend');
  var getColor = require('components/vislib/utils/colorspace');

  return function getLineChart(elem, config) {
    if (typeof config === 'undefined') {
      config = {};
    }

    var chart = {};

    /* ***** Chart Options ***** */
    var addLegend = config.addLegend || false;
    var addTooltip = config.addTooltip || false;
    var shareYAxis = config.shareYAxis || false;
    /* ************************* */

    /* ***** Chart Flags ******* */
    var destroyFlag = false;
    /* ************************* */

    /* ***** Chart Globals ******* */
    var dispatch = d3.dispatch('hover', 'click', 'mouseenter', 'mouseleave', 'mouseout', 'mouseover', 'brush');
    var $elem = $(elem); // cached jquery version of element
    var latestData;
    var prevSize;
    var xValue = function (d, i) {
      return d.x;
    };
    var yValue = function (d, i) {
      return d.y;
    };
  /* ************************* */

    /*
     Renders the chart to the HTML element
     */
    chart.render = function (data) {
      try {
        if (!data) {
          throw new Error('No valid data');
        }
        if (!elem) {
          throw new Error('No elem provided');
        }

        // store a copy of the data sent to render, so that it can be resent with .resize()
        latestData = data;

        // removes elements to redraw the chart on subsequent calls
        d3.select(elem)
          .selectAll('*')
          .remove();

        var chartWrapper = chart.getChartWrapper(elem)[0][0],
          selection = chart.getSelection(chartWrapper, latestData);

        return chart.getVisualization(selection);
      } catch (error) {
        console.group('chart.render: ' + error);
      }
    };

    /*
     Creates the d3 visualization
     */
    chart.getVisualization = function (selection) {
      try {
        if (!selection) {
          throw new Error('No valid selection');
        }

        if (destroyFlag) {
          throw new Error('You destroyed the chart and tried to use it again');
        }

        var colors = chart.getColors(selection);

        // Calculates the max Y axis value for all Charts
        if (shareYAxis) {
          var yAxisMax = chart.getYAxisMax(selection);
        }

        // Adds the legend
        if (addLegend) {
          var legend = getLegend(elem, colors, chart);
        }

        // Adds tooltips
        if (addTooltip) {
          var tip = chart.getTooltip(elem);
        }

        return selection.each(function (d, i) {
          var that = this;

          chart.createLineChart({
            'data': d,
            'index': i,
            'this': that,
            'colors': colors,
            'tip': tip,
            'yAxisMax': yAxisMax
          });
        });
      } catch (error) {
        console.group('chart.getVisualization: ' + error);
      }
    };

    chart.getTooltip = function (elem) {
      try {
        if (!elem) {
          throw new Error('No valid elem');
        }

        var tooltipDiv;

        tooltipDiv = d3.select(elem)
          .append('div')
          .attr('class', 'k4tip');

        return tooltipDiv;
      } catch (error) {
        console.group('chart.getTooltip: ' + error);
      }
    };

    chart.getChartWrapper = function (elem) {
      try {
        if (!elem) {
          throw new Error('No valid elem');
        }

        var chartWrapper = d3.select(elem)
          .append('div');

        chartWrapper
          .attr('class', 'chartwrapper')
          .style('height', $(elem)
            .height() + 'px');

        return chartWrapper;
      } catch (error) {
        console.group('chart.getChartWrapper: ' + error);
      }
    };

    chart.getSelection = function (elem, data) {
      try {
        if (!elem) {
          throw new Error('No valid elem');
        }
        if (!data) {
          throw new Error('No valid data');
        }

        var selection = d3.selectAll(getSelection(elem, data));

        return selection;
      } catch (error) {
        console.group('chart.getSelection: ' + error);
      }
    };

    chart.getColors = function (selection) {
      try {
        if (!selection) {
          throw new Error('No valid selection');
        }

        var colorDomain = chart.getColorDomain(selection),
          lengthOfColorDomain = colorDomain.length,
          colorArray = getColor(lengthOfColorDomain),
          colorDict;

        colorDict = chart.getColorDict(colorDomain, colorArray);

        return colorDict;
      } catch (error) {
        console.group('chart.getColors: ' + error);
      }
    };

    chart.getColorDict = function (colorDomain, colorArray) {
      try {
        if (!colorDomain) {
          throw new Error('No valid colorDomain');
        }
        if (!colorArray) {
          throw new Error('No valid colorArray');
        }

        var colorDict;

        colorDict = _.zipObject(colorDomain, colorArray);

        return colorDict;
      } catch (error) {
        console.group('chart.getColorDict' + error);
      }
    };

    /* Color domain */
    chart.getColorDomain = function (selection) {
      try {
        if (!selection) {
          throw new Error('No valid selection');
        }

        var items = [];

        selection.each(function (d) {
          d.series.forEach(function (label) {
            if (label.label) {
              items.push(label.label);
            } else {
              items.push(d.yAxisLabel);
            }
          });
        });

        items = _.uniq(items);
        return items;
      } catch (error) {
        console.group('chart.getColorDomain: ' + error);
      }
    };

    /* Function for global yAxis */
    chart.getYAxisMax = function (selection) {
      try {
        if (!selection) {
          throw new Error('No valid selection');
        }

        var yArray = [];

        selection.each(function (d) {
          return d3.max(d.series, function (layer) {
            return d3.max(layer.values, function (d) {
              yArray.push(d.y);
            });
          });
        });

        return d3.max(yArray);
      } catch (error) {
        console.group('chart.getYAxisMax: ' + error);
      }
    };

    chart.getBounds = function (data) {
      try {
        if (!data) {
          throw new Error('No valid data');
        }

        var bounds = [];

        data.series.map(function (series) {
          series.values.map(function (d, i) {
            bounds.push({
              x: xValue.call(series, d, i),
              y: yValue.call(series, d, i)
            });
          });
        });

        return bounds;
      } catch (error) {
        console.group('chart.getBounds: ' + error);
      }
    };

    chart.createLineChart = function (args) {
      try {
        if (typeof args === 'undefined') {
          args = {};
        }

        var data = args.data,
          that = args.this,
          colors = args.colors,
          tip = args.tip,
          yAxisMax = args.yAxisMax,
          xAxisLabel = data.xAxisLabel,
          yAxisLabel = data.yAxisLabel,
          chartLabel = data.label,
          xAxisFormatter = data.xAxisFormatter,
          yAxisFormatter = data.yAxisFormatter,
          tooltipFormatter = data.tooltipFormatter;

        var elemWidth = parseInt(d3.select(that)
            .style('width'), 10),
          elemHeight = parseInt(d3.select(that)
            .style('height'), 10);

        if (!elemWidth) {
          throw new Error('The visualization element has no width');
        }
        if (!elemHeight) {
          throw new Error('The visualization element has no height');
        }

        var margin = {
            top: 35,
            right: 15,
            bottom: 35,
            left: 50
          },
          width = elemWidth - margin.left - margin.right,
          height = elemHeight - margin.top - margin.bottom;

        var xTickScale = d3.scale.linear()
          .clamp(true)
          .domain([80, 300, 800])
          .range([0, 2, 4]);

        var yTickScale = d3.scale.linear()
          .clamp(true)
          .domain([20, 40, 1000])
          .range([0, 1, 10]);

        var xTickN = Math.floor(xTickScale(width)),
          yTickN = Math.floor(yTickScale(height));

        var xScale = d3.time.scale()
          .range([0, width]);

        var yScale = d3.scale.linear()
          .range([height, 0]);

        var xAxis = d3.svg.axis()
          .scale(xScale)
          .ticks(xTickN)
          .tickPadding(5)
          .tickFormat(xAxisFormatter)
          .orient('bottom');

        var yAxis = d3.svg.axis()
          .scale(yScale)
          .ticks(yTickN)
          .tickPadding(4)
          .tickFormat(yAxisFormatter)
          .orient('left');

        var interpolate = 'linear';

        var line = d3.svg.line()
          .interpolate(interpolate)
          .x(X)
          .y(Y);

        var voronoi = d3.geom.voronoi()
          .x(function(d) { return xScale(d.x); })
          .y(function(d) { return yScale(d.y); })
          .clipExtent([
            [-margin.left, -margin.top],
            [width + margin.right, height + margin.bottom]
          ]);

        var vis = d3.select(elem);
        var allLayers = vis.selectAll('path');
        var allItms = d3.select('.legendwrapper')
          .selectAll('li.legends');
        var scrolltop = document.body.scrollTop;
        var mousemove;

        /* *** Data Manipulation *** */
        var seriesData = [];

        // adds the label value to each data point
        // within the values array for displaying in the tooltip
        data.series.forEach(function (d) {
          d.values.forEach(function (e) {
            e.label = d.label;
          });
        });

        data.series.map(function (series) {
          seriesData.push(series);
        });

        xScale.domain(d3.extent(chart.getBounds(data), function (d) {
          return d.x;
        }));

        // setting the y scale domain
        if (shareYAxis) {
          yScale
            .domain([0, yAxisMax])
            .nice(yTickN);
        } else {
          yScale
            .domain([0, d3.max(chart.getBounds(data), function (d) {
              return d.y;
            })])
            .nice(yTickN);
        }
        /* ************************** */

        var svg = d3.select(that)
          .append('svg')
          .attr('class', 'canvas')
          .attr('width', '100%')
          .attr('height', '100%');

        var g = svg.append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // background rect
        g.append('rect')
          .attr('class', 'chart-bkgd')
          .attr('width', width)
          .attr('height', height);

        g.append('g')
          .attr('class', 'x axis')
          .attr('transform', 'translate(0,' + height + ')')
          .call(xAxis)
          .selectAll('text')
          .call(chart.tickText, width)
          .on('mouseover', function (d) {
            if (addTooltip) {
              var hh = tip[0][0].scrollHeight;

              mousemove = {
                left: d3.event.pageX,
                top: d3.event.pageY
              };

              d3.select(that)
                .style('cursor', 'default');

              return tip.datum(d)
                .text(d)
                .style('top', mousemove.top - scrolltop - hh / 2 + 'px')
                .style('left', mousemove.left + 20 + 'px')
                .style('visibility', 'visible');
            }
          })
          .on('mouseout', function () {
            d3.select(that)
              .classed('hover', false)
              .style('stroke', null);
            if (addTooltip) {
              tip.style('visibility', 'hidden');
            }
          });

        g.append('g')
          .attr('class', 'y axis')
          .call(yAxis);

        // Axis labels
        g.append('text')
          .attr('class', 'x-axis-label')
          .attr('text-anchor', 'middle')
          .attr('x', width / 2)
          .attr('y', height + 30)
          .text(xAxisLabel);

        g.append('text')
          .attr('class', 'y-axis-label')
          .attr('text-anchor', 'middle')
          .attr('x', -height / 2)
          .attr('y', -40)
          .attr('dy', '.75em')
          .attr('transform', 'rotate(-90)')
          .text(yAxisLabel);

        // Chart title
        g.append('text')
          .attr('class', 'charts-label')
          .attr('text-anchor', 'middle')
          .attr('x', width / 2)
          .attr('y', -10)
          .text(chartLabel)
          .call(chart.tickText, width)
          .on('mouseover', function (d) {
            if (addTooltip) {
              var hh = tip[0][0].scrollHeight;

              mousemove = {
                left: d3.event.pageX,
                top: d3.event.pageY
              };

              d3.select(that)
                .style('cursor', 'default');

              return tip.text(d.label)
                .style('top', mousemove.top - scrolltop - hh / 2 + 'px')
                .style('left', mousemove.left + 20 + 'px')
                .style('visibility', 'visible');
            }
          })
          .on('mouseout', function () {
            d3.select(that)
              .classed('hover', false)
              .style('stroke', null);
            if (addTooltip) {
              tip.style('visibility', 'hidden');
            }
          });

        var lines = g.selectAll('.lines')
          .data(seriesData)
          .enter()
          .append('g')
          .attr('class', 'lines');

        lines.append('path')
          .attr('class', function (d) {
            return 'rl rl-' + chart.getClassName(d.label, yAxisLabel);
          })
          .attr('d', function (d) {
            return line(d.values);
          })
          .attr('fill', 'none')
          .attr('stroke', function (d) {
            return d.label ? colors[d.label] : colors[yAxisLabel];
          })
          .attr('stroke-width', 3);

        var voronoiGroup = g.append("g")
          .attr("class", "voronoi");

        voronoiGroup.selectAll("path")
          .data(seriesData, function (d) {
            return voronoi(d.values);
          })
          .enter().append("path")
          .attr("d", function (d) { return line(d.values); })
          .attr('fill', 'none')
          .datum(function (d) { return d.values; })
//          .on("mouseover", mouseover)
//          .on("mouseout", mouseout);

        var layer = g.selectAll('.layer')
          .data(seriesData)
          .enter()
          .append('g')
          .attr('class', function (d) {
            return 'rl rl-' + chart.getClassName(d.label, yAxisLabel);
          })
          .attr('stroke', function (d) {
            return d.label ? colors[d.label] : colors[yAxisLabel];
          });

        var circle = layer.selectAll('.points')
          .data(function (d) {
            return d.values;
          })
          .enter()
          .append('circle')
          .attr('class', 'points')
          .attr('cx', function (d) {
            return xScale(d.x);
          })
          .attr('cy', function (d) {
            return yScale(d.y);
          })
          .attr('r', 8);

        circle
          .attr('fill', '#ffffff')
          .attr('stroke', function (d) {
            return d.label ? colors[d.label] : colors[yAxisLabel];
          })
          .attr('stroke-width', 3.5)
          .attr('opacity', 0);

        circle
          .on('mouseover', function (d, i) {
            var point = d3.select(this);
            var layerClass = '.rl-' + chart.getClassName(d.label, yAxisLabel);

            point.attr('opacity', 1)
              .classed('hover', true)
              .style('cursor', 'pointer');

            // highlight chart layer
            allLayers = vis.selectAll('path');
            allLayers.style('opacity', 0.3);

            vis.selectAll(layerClass)
              .style('opacity', 1);

            // highlight legend item
            if (allItms) {
              allItms.style('opacity', 0.3);

              var itm = d3.select('.legendwrapper')
                .select(layerClass)
                .style('opacity', 1);
            }

            dispatch.hover({
              value: yValue(d, i),
              point: d,
              pointIndex: i,
              series: data.series,
              config: config,
              data: latestData,
              e: d3.event
            });

            d3.event.stopPropagation();
          })
          .on('mousemove', function (d) {
            if (addTooltip) {
              var hh = tip[0][0].scrollHeight,
                datum;

              mousemove = {
                left: d3.event.pageX,
                top: d3.event.pageY
              };

              if (typeof d.label !== 'undefined') {
                datum = {
                  label: d.label,
                  x: d.x,
                  y: d.y
                };
              } else {
                datum = {
                  x: d.x,
                  y: d.y
                };
              }

              tip.datum(datum)
                .text(tooltipFormatter)
                .style('top', mousemove.top - scrolltop - hh / 2 + 'px')
                .style('left', mousemove.left + 20 + 'px')
                .style('visibility', 'visible');
            }
          })
          .on('click', function (d, i) {
            dispatch.click({
              value: yValue(d, i),
              point: d,
              pointIndex: i,
              series: data.series,
              config: config,
              data: latestData,
              e: d3.event
            });
            d3.event.stopPropagation();
          })
          .on('mouseout', function () {
            var point = d3.select(this);
            point.attr('opacity', 0);
            if (addTooltip) {
              tip.style('visibility', 'hidden');
            }
            allLayers.style('opacity', 1);
            allItms.style('opacity', 1);
          });

        if (addTooltip) {
          // **** hilite series on hover
          allLayers = vis.selectAll('path');
          lines.on('mouseover', function (d) {
            // highlight chart layer
            allLayers.style('opacity', 0.3);
            var layerClass = '.rl-' + chart.getClassName(d.label, yAxisLabel);
            var myLayer = vis.selectAll(layerClass)
              .style('opacity', 1);

            // stroke this rect
            d3.select(this)
              .classed('hover', true)
              .style('stroke', '#333')
              .style('cursor', 'pointer');

            // hilite legend item
            if (allItms) {
              allItms.style('opacity', 0.3);
              var itm = d3.select('.legendwrapper')
                .select(layerClass)
                .style('opacity', 1);
            }
          });
        }

        /* Event Selection: BRUSH */
        var brush = d3.svg.brush()
          .x(xScale)
          .on('brushend', brushend);

        if (dispatch.on('brush')) {
          g.append('g')
            .attr('class', 'brush')
            .call(brush)
            .selectAll('rect')
            .attr('height', height);
        }
        /* ************************** */

        lines.on('mouseout', function () {
          allLayers.style('opacity', 1);
          allItms.style('opacity', 1);
        });

        return svg;

      } catch (error) {
        console.group('chart.createLineChart: ' + error);
      }

      function X(d) {
        return xScale(d.x);
      }

      function Y(d) {
        return yScale(d.y);
      }

      function brushend() {
        var selected;
        var start;
        var lastVal;
        var end;
        var selectedRange;

        // selected is used to determine the range for ordinal scales
        selected = xScale.domain()
          .filter(function (d) {
            return (brush.extent()[0] <= xScale(d)) && (xScale(d) <= brush.extent()[1]);
          });

        start = selected[0];
        lastVal = selected.length - 1;
        end = selected[lastVal];
        selectedRange = [start, end];

        return brush.extent()[0] instanceof Date ?
          dispatch.brush({
            range: brush.extent(),
            config: config,
            e: d3.event,
            data: latestData
          }) :
          dispatch.brush({
            range: selectedRange,
            config: config,
            e: d3.event,
            data: latestData
          });
      }
    };

    // getters / setters
    chart.resize = _.debounce(function () {
      try {
        if (!latestData) {
          throw new Error('No valid data');
        }
        chart.render(latestData);
      } catch (error) {
        console.group('chart.resize: ' + error);
      }
    }, 200);

    // enable auto-resize
    chart.checkSize = function checkSize() {
      try {
        var size = $elem.width() + ':' + $elem.height();

        if (prevSize !== size) {
          chart.resize();
        }
        prevSize = size;

        setTimeout(checkSize, 250);
      } catch (error) {
        console.group('chart.checkSize: ' + error);
      }
    };

    /* Function for truncating x axis tick labels */
    chart.tickText = function (text, width) {
      try {
        if (!text) {
          throw new Error('No text was given');
        }
        if (!width) {
          throw new Error('No width was given');
        }

        var n = text[0].length,
          maxw = width / n * 0.9,
          tickn = Math.floor(maxw);

        text.each(function () {
          var text = d3.select(this),
            length = this.getComputedTextLength(),
            tspan = text.text();

          if (length > maxw) {
            var str = text.text(),
              avg = length / str.length,
              end = Math.floor(maxw / avg);
            str = str.substr(0, end) + '...';
            tspan = text.text(str);
          }
        });

      } catch (error) {
        console.group('chart.tickText: ' + error);
      }
    };

    chart.getClassName = function (label, yAxisLabel) {
      try {
        return label ? chart.classifyString(label) : chart.classifyString(yAxisLabel);
      } catch (error) {
        console.group('chart.getClassName: ' + error);
      }
    };

    chart.classifyString = function (string) {
      try {
        if (!chart.isString(string)) {
          string = chart.stringify(string);
        }
        return string.replace(/[.]+|[/]+|[\s]+|[*]+|[;]+|[(]+|[)]+|[:]+|[,]+/g, '');
      } catch (error) {
        console.group('chart.classifyString: ' + error);
      }
    };

    chart.isString = function (value) {
      try {
        if (typeof value === 'string') {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        console.group('chart.isString: ' + error);
      }
    };

    chart.stringify = function (value) {
      try {
        var string = value + '';
        return string;
      } catch (error) {
        console.group('chart.stringify: ' + error);
      }
    };

    chart.error = function () {
      try {
        // Removes the legend container
        d3.select(elem)
          .selectAll('*')
          .remove();

        var errorWrapper = d3.select(elem)
          .append('div')
          .attr('class', 'errorWrapper')
          .style('height', function () {
            return $(elem)
              .height() + 'px';
          })
          .style('text-align', 'center');

        errorWrapper.append('p')
          .style('font-size', '18px')
          .style('margin-top', function () {
            return $(elem)
              .height() / 3 + 'px';
          })
          .style('line-height', '18px')
          .text('The container is too small for this chart.');

        return chart;
      } catch (error) {
        console.group('chart.error: ' + error);
      }
    };

    chart.off = function (event) {
      try {
        dispatch.on(event, null);
        return chart;
      } catch (error) {
        console.group('chart.off: ' + error);
      }
    };

    /*
     * Destroys all charts associated with the parent element
     * if the argument passed is true. By default the argument
     * is true.
     */
    chart.destroy = function (_) {
      try {
        if (!arguments.length || _) {
          destroyFlag = _ || true;

          // Removing chart and all elements associated with it
          d3.select(elem)
            .selectAll('*')
            .remove();

          // Cleaning up event listeners
          chart.off('click');
          chart.off('hover');
          chart.off('brush');
          d3.select(window)
            .on('resize', null);
        }

        destroyFlag = _;
        return chart;
      } catch (error) {
        console.group('chart.destroy: ' + error);
      }
    };

    chart.dispatch = dispatch;

    d3.rebind(chart, dispatch, 'on');
    d3.select(window)
      .on('resize', chart.resize);

    chart.checkSize();

    return chart;
  };
});