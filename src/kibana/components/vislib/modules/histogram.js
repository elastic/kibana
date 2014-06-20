define(function (require) {
  var $ = require('jquery');
  var d3 = require('d3');
  var _ = require('lodash');

  var getSelection = require('components/vislib/utils/selection');
  var injectZeros = require('components/vislib/utils/zeroInjection');
  var getLegend = require('components/vislib/modules/legend');
  var getColor = require('components/vislib/utils/colorspace');

  // Dynamically adds css file
  require('css!components/vislib/styles/k4.d3');

  return function histogram(elem, config) {
    if (typeof config === 'undefined') {
      config = {};
    }

    var chart = {};

    var shareYAxis = config.shareYAxis || false;
    var addLegend = config.addLegend || false;
    var addTooltip = config.addTooltip || false;
    var offset = config.offset || 'zero';

    var destroyFlag = false;

    var dispatch = d3.dispatch(
      'hover', 'click', 'mouseenter',
      'mouseleave', 'mouseout', 'mouseover',
      'brush'
    );
    var $elem = $(elem);
    var latestData;
    /* ***************************** */

    chart.render = function render(data) {
      try {
        var chartWrapper;
        var selection;

        if (!data) {
          throw new Error('No valid data');
        }

        if (!elem) {
          throw new Error('No elem provided');
        }

        // store a copy of the data sent to render,
        // so that it can be resent with .resize()
        latestData = data;

        chart.removeAll(elem);
        chartWrapper = chart.getChartWrapper(elem)[0][0];
        selection = chart.getSelection(chartWrapper, latestData);

        return chart.getVisualization(selection);
      } catch (error) {
        console.error('chart.render: ' + error);
      }
    };

    // removes elements to redraw the chart on subsequent calls
    chart.removeAll = function (elem) {
      d3.select(elem)
        .selectAll('*')
        .remove();

      return chart;
    };

    chart.getVisualization = function (selection) {
      try {
        if (!selection) {
          throw new Error('No valid selection');
        }

        if (destroyFlag) {
          throw new Error('You destroyed the chart and tried to use it again');
        }

        return selection.each(function (d, i) {
          var that = this;
          var colors = chart.getColors(selection);
          var tip = chart.addTooltip(addTooltip, elem);
          var yAxisMax = chart.getSameYAxis(shareYAxis, selection);

          chart.addLegend(addLegend, elem, colors, chart);
          chart.createHistogram({
            data: d,
            index: i,
            this: that,
            colors: colors,
            tip: tip,
            yAxisMax: yAxisMax,
            isTooltip: addTooltip,
            isSharingYAxis: shareYAxis
          });
        });
      } catch (error) {
        console.error('chart.getVisualization: ' + error);
      }
    };

    chart.addTooltip = function (boolean, elem) {
      if (boolean) {
        var tip = chart.getTooltip(elem);
        return tip;
      }
    };

    chart.getSameYAxis = function (boolean, selection) {
      if (boolean) {
        var yAxisMax = chart.getYAxisMax(selection);
        return yAxisMax;
      }
    };

    chart.addLegend = function (boolean, elem, colors, chart) {
      if (boolean) {
        return getLegend(elem, colors, chart);
      }
      return;
    };

    chart.getChartWrapper = function (elem) {
      try {
        var chartWrapper;

        if (!elem) {
          throw new Error('No valid elem');
        }

        chartWrapper = d3.select(elem)
          .append('div')
          .attr('class', 'chartwrapper')
          .style('height', $(elem).height() + 'px');

        return chartWrapper;
      } catch (error) {
        console.error('chart.getChartWrapper: ' + error);
      }
    };

    chart.getSelection = function (elem, data) {
      try {
        var selection;

        if (!elem) {
          throw new Error('No valid elem');
        }

        if (!data) {
          throw new Error('No valid data');
        }

        selection = d3.selectAll(getSelection(elem, data));

        return selection;
      } catch (error) {
        console.error('chart.getSelection: ' + error);
      }
    };

    chart.getTooltip = function (elem) {
      try {
        var tooltipDiv;

        if (!elem) {
          throw new Error('No valid elem');
        }

        tooltipDiv = d3.select(elem)
          .append('div')
          .attr('class', 'k4tip');

        return tooltipDiv;
      } catch (error) {
        console.error('chart.getTooltip: ' + error);
      }
    };

    chart.getColors = function (selection) {
      try {
        var colorDomain;
        var lengthOfColorDomain;
        var colorArray;
        var colorDict;

        if (!selection) {
          throw new Error('No valid selection');
        }

        colorDomain = chart.getColorDomain(selection);
        lengthOfColorDomain = colorDomain.length;
        colorArray = getColor(lengthOfColorDomain);
        colorDict = chart.getColorDict(colorDomain, colorArray);

        return colorDict;
      } catch (error) {
        console.error('chart.getColors: ' + error);
      }
    };

    chart.getColorDict = function (colorDomain, colorArray) {
      try {
        var colorDict;

        if (!colorDomain) {
          throw new Error('No valid colorDomain');
        }
        if (!colorArray) {
          throw new Error('No valid colorArray');
        }

        colorDict = _.zipObject(colorDomain, colorArray);

        return colorDict;
      } catch (error) {
        console.error('chart.getColorDict' + error);
      }
    };

    /* Color domain */
    chart.getColorDomain = function (selection) {
      try {
        var items = [];

        if (!selection) {
          throw new Error('No valid selection');
        }

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
        console.error('chart.getColorDomain: ' + error);
      }
    };

    chart.getClassName = function (label, yAxisLabel) {
      try {
        if (label) {
          return chart.classifyString(label);
        } else {
          return chart.classifyString(yAxisLabel);
        }
      } catch (error) {
        console.error('chart.getClassName: ' + error);
      }
    };

    chart.classifyString = function (string) {
      try {
        if (!chart.isString(string)) {
          string = chart.stringify(string);
        }
        return string
          .replace(/[.]+|[/]+|[\s]+|[*]+|[;]+|[(]+|[)]+|[:]+|[,]+/g, '');
      } catch (error) {
        console.error('chart.classifyString: ' + error);
      }
    };

    chart.isString = function (value) {
      if (typeof value === 'string') {
        return true;
      }
      return false;
    };

    chart.stringify = function (value) {
      return value + '';
    };

    chart.checkForNumbers = function (array) {
      try {
        var num = 0;
        var i;

        for (i = 0; i < array.length; i++) {
          if (chart.isNumber(array[i])) {
            num++;
          }
        }
        if (num === array.length) {
          return true;
        }
        return false;
      } catch (error) {
        console.error('chart.checkForNumber: ' + error);
      }
    };

    chart.convertStringsToNumbers = function (array) {
      try {
        if (chart.checkForNumbers(array)) {
          var i;

          for (i = 0; i < array.length; i++) {
            array[i] = chart.convertToNumber(array[i]);
          }
          return array;
        }
        return array;
      } catch (error) {
        console.error('chart.convertStringsToNumbers: ' + error);
      }
    };

    chart.convertToNumber = function (n) {
      return +n;
    };

    chart.isNumber = function (n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    };

    chart.getYAxisMax = function (selection) {
      try {
        var yArray = [];
        var stack = d3.layout.stack()
          .values(function (d) { return d.values; });

        selection.each(function (d) {
          d = injectZeros(d);
          return d3.max(stack(d.series), function (layer) {
            return d3.max(layer.values, function (d) {
              if (offset === 'group') {
                yArray.push(d.y);
              } else {
                yArray.push(d.y0 + d.y);
              }
            });
          });
        });

        return d3.max(yArray);

      } catch (error) {
        console.error('chart.getYAxisMax: ' + error);
      }
    };

    chart.appendLabelsToData = function (d, yAxisLabel) {
      d.values.forEach(function (e) {
        var label = d.label ? d.label : yAxisLabel;
        e.label = label;
      });
    };

    chart.getYGroupMax = function (data) {
      d3.max(data, function (d) {
        return d3.max(d.values, function (e) {
          return e.y;
        });
      });
    };

    chart.getYStackMax = function (data) {
      d3.max(data, function (d) {
        return d3.max(d.values, function (e) {
          return e.y0 + d.y;
        });
      });
    };

    chart.getXAxisKeys = function (data) {
      var keys = d3.set(data.map(function (d) {
        return d.x;
      }))
        .values();

      return chart.convertStringsToNumbers(keys);
    };

    chart.createHistogram = function (args) {
      try {
        if (typeof args === 'undefined') {
          args = {};
        }

        var data = injectZeros(args.data);
        var that = args.this;
        var colors = args.colors;
        var tip = args.tip;
        var yAxisMax = args.yAxisMax;

        var xAxisLabel = data.xAxisLabel;
        var yAxisLabel = data.yAxisLabel;
        var chartLabel = data.label;
        var xAxisFormatter = data.xAxisFormatter || function (v) {
          return v;
        };
        var yAxisFormatter = data.yAxisFormatter;
        var tooltipFormatter = data.tooltipFormatter;

        var vis = d3.select(elem);
        var allItms = d3.select('.legendwrapper')
          .selectAll('li.legends');
        var scrolltop = document.body.scrollTop;
        var allLayers = vis.selectAll('rect');
        var mousemove;
        var getX = function (d, i) {
          return d.x;
        };
        var getY = function (d, i) {
          return d.y;
        };

        // width, height, margins
        var margin = { top: 35, right: 15, bottom: 35, left: 60 };
        var elemWidth = parseInt(d3.select(that)
          .style('width'), 10);
        var elemHeight = parseInt(d3.select(that)
          .style('height'), 10);
        var width = elemWidth - margin.left - margin.right;
        var height = elemHeight - margin.top - margin.bottom;
        var dataLength = data.series[0].values.length;

        /* Error Handling around width and height NaN values */
        if (isNaN(width) || isNaN(height)) {
          throw new Error('width: ' + width + '; height:' + height);
        }

        if (height <= margin.top) {
          throw new Error('The container is too small for this chart.');
        }

        /* Error Handler that prevents a chart from being rendered when
         there are too many data points for the width of the container. */
        if (width / dataLength <= 4) {
          throw new Error('The container is too small for this chart.');
        }

        // adds the label value to each data point
        // within the values array for displaying in the tooltip
        data.series.forEach(function (d) {
          return chart.appendLabelsToData(d, yAxisLabel);
        });

        // preparing the data and scales
        var stack = d3.layout.stack()
          .values(function (d) { return d.values; })
          .offset(offset);
        var layers = stack(data.series);
        var n = layers.length; // number of layers
        var yGroupMax = chart.getYGroupMax(layers);
        var yStackMax = chart.getYStackMax(layers);
        var keys = chart.getXAxisKeys(layers[0].values);

        var xScale;

        if (data.ordered !== undefined && data.ordered.date !== undefined) {
          var maxDate = data.ordered.max;
          var minDate = data.ordered.min;
          var milsInterval = data.ordered.interval;
          var testInterval;
          var dateoffset;

          if (milsInterval >= 86400000 * 364) {
            testInterval = 'year';
            dateoffset = 1;
          }
          if (milsInterval < 86400000 * 364) {
            testInterval = 'month';
            dateoffset = 1;
          }
          if (milsInterval < 86400000 * 30) {
            testInterval = 'week';
            dateoffset = (milsInterval / 86400000 * 7);
          }
          if (milsInterval < 86400000 * 7) {
            testInterval = 'day';
            dateoffset = (milsInterval / 86400000);
          }
          if (milsInterval < 86400000) {
            testInterval = 'hour';
            dateoffset = (milsInterval / 3600000);
          }
          if (milsInterval < 3600000) {
            testInterval = 'minute';
            dateoffset = (milsInterval / 60000);
          }
          if (milsInterval < 60000) {
            testInterval = 'second';
            dateoffset = (milsInterval / 1000);
          }

          // apply interval to last date in keys
          var maxIntervalOffset = d3.time[testInterval]
            .offset(new Date(maxDate), dateoffset);
          var minIntervalOffset = d3.time[testInterval]
            .offset(new Date(minDate), -dateoffset);

          xScale = d3.time.scale()
            .domain([minIntervalOffset, maxIntervalOffset])
            .range([0, width]);
        } else {
          xScale = d3.scale.ordinal()
            .domain(keys)
            .rangeRoundBands([0, width], 0.1);
        }

        var yScale = d3.scale.linear()
          .range([height, 0]);

        var xTickScale = d3.scale.linear()
          .clamp(true)
          .domain([80, 300, 800])
          .range([0, 2, 4]);

        var xTicks = Math.floor(xTickScale(width));

        var xAxis = d3.svg.axis()
          .scale(xScale)
          .ticks(xTicks)
          .tickPadding(5)
          .tickFormat(xAxisFormatter)
          .orient('bottom');

        // tickScale uses height to get tickN value for ticks() and nice()
        var tickScale = d3.scale.linear()
            .clamp(true)
            .domain([20, 40, 1000])
            .range([0, 2, 10]),
          tickN = Math.floor(tickScale(height));

        var yAxis = d3.svg.axis()
          .scale(yScale)
          .ticks(tickN)
          .tickPadding(4)
          .tickFormat(yAxisFormatter)
          .orient('left');

        // setting the y scale domain
        if (shareYAxis) {
          yScale.domain([0, yAxisMax])
            .nice(tickN);
        } else {
          if (offset === 'group') {
            yScale.domain([0, yGroupMax])
              .nice(tickN);
          } else {
            yScale.domain([0, yStackMax])
              .nice(tickN);
          }
        }

        // canvas
        var svg = d3.select(that)
          .append('svg')
          .attr('class', 'canvas')
          .attr('width', '100%')
          .attr('height', '100%');

        var g = svg.append('g')
          .attr('transform',
            'translate(' + margin.left + ',' + margin.top + ')');

        // background rect
        g.append('rect')
          .attr('class', 'chart-bkgd')
          .attr('width', width)
          .attr('height', height);

        // x axis
        g.append('g')
          .attr('class', 'x axis')
          .attr('transform', 'translate(0,' + height + ')')
          .call(xAxis)
          .selectAll('text')
          .call(chart.tickText, width)
          .on('mouseover', function (d) {
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
          })
          .on('mouseout', function () {
            d3.select(that)
              .classed('hover', false)
              .style('stroke', null);
            tip.style('visibility', 'hidden');
          });

        // y axis
        g.append('g')
          .attr('class', 'y axis')
          .call(yAxis);

        // Axis labels
        g.append('text')
          .attr('class', 'x-axis-label')
          .attr('text-anchor', 'middle')
          .attr('x', width / 2)
          .attr('y', height + 30)
          .text(data.xAxisLabel);

        g.append('text')
          .attr('class', 'y-axis-label')
          .attr('text-anchor', 'middle')
          .attr('x', -height / 2)
          .attr('y', function () {
            // get width of y axis group for label offset
            var ww = g.select('.y.axis')
              .node()
              .getBBox();

            return -1 * ww.width - 14;
          })
          .attr('dy', '.75em')
          .attr('transform', 'rotate(-90)')
          .text(yAxisLabel);

        // Chart title
        g.append('text')
          .attr('class', 'charts-label')
          .attr('text-anchor', 'middle')
          .attr('x', width / 2)
          .attr('y', -10)
          .text(data.label)
          .call(chart.tickText, width)
          .on('mouseover', function (d) {
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
          })
          .on('mouseout', function () {
            d3.select(that)
              .classed('hover', false)
              .style('stroke', null);

            tip.style('visibility', 'hidden');
          });

        /* Event Selection: BRUSH */
        var brush = d3.svg.brush()
          .x(xScale)
          .on('brushend', function brushend() {
            var selected, start, lastVal, end, selectedRange;

            // selected is used to determine the range for ordinal scales
            selected = xScale.domain()
              .filter(function (d) {
                return (brush.extent()[0] <= xScale(d)) &&
                  (xScale(d) <= brush.extent()[1]);
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
          });

        if (dispatch.on('brush')) {
          g.append('g')
            .attr('class', 'brush')
            .call(brush)
            .selectAll('rect')
            .attr('height', height);
        }
        /* ************************** */

        // layers
        var layer = g.selectAll('.layer')
          .data(function (d) {
            return d.series;
          })
          .enter()
          .append('g')
          .attr('class', function (d) {
            if (!d.label) {
              return colors[yAxisLabel];
            } else {
              return colors[d.label];
            }

          })
          .style('fill', function (d) {
            if (!d.label) {
              return colors[yAxisLabel];
            } else {
              return colors[d.label];
            }

          });

        var bars = layer.selectAll('rect')
          .data(function (d) {
            return d.values;
          });

        // enter
        bars.enter()
          .append('rect')
          .attr('class', function (d) {
            return 'rl rl-' + chart.getClassName(d.label, yAxisLabel);
          })
          .on('mouseover', function (d, i) {
            d3.select(this)
              .classed('hover', true)
              .style('stroke', '#333')
              .style('cursor', 'pointer');

            dispatch.hover({
              value: getY(d, i),
              point: d,
              pointIndex: i,
              series: data.series,
              config: config,
              data: latestData,
              e: d3.event
            });

            d3.event.stopPropagation();
          })
          .on('click', function (d, i) {
            dispatch.click({
              value: getY(d, i),
              point: d,
              pointIndex: i,
              series: data.series,
              config: config,
              data: latestData,
              e: d3.event
            });

            d3.event.stopPropagation();
          });

        if (addTooltip) {
          // **** hilite series on hover
          var legendwrap = d3.select('.legendwrapper');
          var itm;
          var itmRect;
          var ht;
          var ot;

          bars.on('mouseover', function (d) {
            var layerClass = '.rl-' + chart.getClassName(d.label, yAxisLabel);
            var itm;

            // hilite chart layer
            allLayers = vis.selectAll('rect');
            allLayers.style('opacity', 0.3);
            vis.selectAll(layerClass)
              .style('opacity', 1);

            // stroke this rect
            d3.select(this)
              .classed('hover', true)
              .style('stroke', '#333');
            // .style('cursor', 'pointer');

            // hilite legend item
            if (allItms) {
              allItms.style('opacity', 0.3);
              itm = d3.select('.legendwrapper')
                .select(layerClass)
                .style('opacity', 1);
            }

            // scroll legend
            if (chart.headerOpen === true) {
              ht = legendwrap.node()
                .getBoundingClientRect()
                .height;
              if (itm && itm.node()) {
                ot = itm.node()
                  .offsetTop;
                legendwrap.node()
                  .scrollTop = 35 + ot - ht;
              } else {
                legendwrap.node()
                  .scrollTop = 0;
              }
            }

          });

          bars.on('mousemove', function (d) {
            var datum, hh = tip[0][0].scrollHeight;

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
          });

          bars.on('mouseout', function () {
            d3.select(this)
              .classed('hover', false)
              .style('stroke', null);
            tip.style('visibility', 'hidden');
            allLayers.style('opacity', 1);
            allItms.style('opacity', 1);
          });

        }

        // update
        switch (offset) {
          case 'group':
            bars
              // ******  DATE FORMAT  *******
              .attr('x', function (d, i, j) {
                return data.ordered === undefined || !data.ordered.date ?
                  xScale(d.x) + xScale.rangeBand() / n * j :
                  xScale(d.x) - (width / (keys.length + 1) / 2);
              })
              .attr('width', function () {
                return data.ordered === undefined || !data.ordered.date ?
                  xScale.rangeBand() / n : width / (keys.length + 1) / n;
              })
              .attr('y', function (d) {
                return yScale(d.y);
              })
              .attr('height', function (d) {
                return height - yScale(d.y);
              });
            break;

          default:
            bars
              .attr('x', function (d) {
                return xScale(d.x);
              })
              .attr('width', function () {
                var val;
                if (data.ordered === undefined || !data.ordered.date) {
                  val = xScale.rangeBand();
                } else {
                  val = xScale(data.ordered.min + data.ordered.interval) -
                    xScale(data.ordered.min) - 2;
                }
                if (isNaN(val) || val < 0) {
                  throw new Error('line 894: bars attr width: ' + val);
                } else {
                  return val;
                }
              })
              .attr('y', function (d) {
                var val = yScale(d.y0 + d.y);
                if (isNaN(val) || val < 0) {
                  throw new Error('line 907: bars attr y: ' + val);
                } else {
                  return val;
                }
              })
              .attr('height', function (d) {
                var val = yScale(d.y0) - yScale(d.y0 + d.y);
                if (isNaN(val) || val <= 0) {
                  throw new Error('line 915: bars attr height: ' + val);
                } else {
                  return val;
                }
              });
            break;
        }

        // exit
        bars.exit()
          .remove();

        return svg;
      } catch (error) {
        if (error.message === 'The container is too small for this chart.') {
          chart.error(error.message);
        }
        console.error('chart.createHistogram: ' + error);
      }
    };

    /* Function for truncating x axis tick labels */
    chart.tickText = function (text, width) {
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
    };

    // getters / setters
    chart.resize = _.debounce(function () {
      if (latestData) {
        chart.render(latestData);
      }
    }, 200);

    // enable auto-resize
    var prevSize;
    (function checkSize() {
      var size = $elem.width() + ':' + $elem.height();
      if (prevSize !== size) {
        chart.resize();
      }
      prevSize = size;
      setTimeout(checkSize, 250);
    }());

    chart.dispatch = dispatch;

    chart.off = function (event) {
      dispatch.on(event, null);
      return chart;
    };

    chart.destroy = function (_) {
      /*
       Destroys all charts associated with the parent element
       if the argument passed is true. By default the argument
       is true.
       */
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
    };

    chart.error = function (message) {
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
        .text(message);
      return chart;
    };

    d3.rebind(chart, dispatch, 'on');
    d3.select(window)
      .on('resize', chart.resize);

    return chart;
  };
});
