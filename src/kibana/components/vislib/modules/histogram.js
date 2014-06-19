define(function (require) {
  var $ = require('jquery');
  var d3 = require('d3');
  var _ = require('lodash');

  var selectionFn = require('components/vislib/utils/selection');
  var zeroInjection = require('components/vislib/utils/zeroInjection');
  var legendFn = require('components/vislib/modules/legend');
  var getColor = require('components/vislib/utils/colorspace');

  // Dynamically adds css file
  require('css!components/vislib/styles/k4.d3');

  return function histogram(elem, args) {
    if (typeof args === 'undefined') {
      args = {};
    }

    var chart = {};
    var destroyFlag = false;
    var shareYAxis = args.shareYAxis || false;
    var addLegend = args.addLegend || false;
    var addTooltip = args.addTooltip || false;
    var margin = args.margin || { top: 35, right: 15, bottom: 35, left: 60 };
    var offset = args.offset || 'zero';
    var dispatch = d3.dispatch('hover', 'click', 'mouseenter', 'mouseleave', 'mouseout', 'mouseover', 'brush');
    var getY = function (d, i) { return d.y; };
    var getX = function (d, i) { return d.x; };
    var colDomain;
    var stack = d3.layout.stack().values(function (d) { return d.values; });
    var $elem = $(elem);
    var vis = d3.select(elem);
    var allLayers;
    var globalYAxis;
    var mousemove;
    var scrolltop;
    var selection;
    var elemWidth;
    var elemHeight;
    var width;
    var height;
    var layers;
    var n;
    var yGroupMax;
    var yStackMax;
    var keys;
    var xScale;
    var yScale;
    var xAxis;
    var yAxis;
    var layer;
    var bars;
    var legend;
    var tip;
    var xAxisFormatter;
    var yAxisFormatter;
    var tooltipFormatter;
    var dataLength;
    var latestData;
    var chartwrapper;
    var allItms = false;

    /* ***************************** */

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

        var colorDict = _.zipObject(colorDomain, colorArray);

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

    chart.render = function render(data) {
      // store a copy of the data sent to render, so that it can be resent with .resize()
      latestData = data;

      // removes elements to redraw the chart on subsequent calls
      d3.select(elem)
        .selectAll('*')
        .remove();

      if (destroyFlag || !elem) {
        if (destroyFlag) {
          throw new Error('you destroyed this chart and then tried to use it again');
        } else {
          throw new Error('there is no element present');
        }
      }

      // HTML div in which charts are contained
      chartwrapper = d3.select(elem)
        .append('div')
        .attr('class', 'chartwrapper')
        .style('height', $(elem).height() + 'px');

      // Selection function - returns an array of DOM elements with data bound
      try {
        selection = d3.selectAll(selectionFn(chartwrapper[0][0], latestData));
      } catch (error) {
        return;
      }

      // get colDomain from chart obj

      var colors = chart.getColors(selection);

      // Chart options
      if (addLegend) {
        legend = legendFn(elem, colors, chart);
        allItms = d3.select('.legendwrapper').selectAll('li.legends');
      }

      if (addTooltip) {
        tip = d3.select(elem)
          .append('div')
          .attr('class', 'k4tip');
      }

      try {
        selection.each(function (d, i) {
          var that = this;
          chart.iterateSelection({
            'data': d,
            'index': i,
            'this': that,
            'colors': colors
          });
        });
      } catch (err) {
        if (err.message === 'chart too small') {
          chart.error();
        }
        console.group(err);
      }

      return chart;
    };

    /* Color domain */
    chart.colorDomain = function (selection) {
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
    };

    /* Function for global yAxis */
    chart.globalYAxisFn = function (selection) {
      var yArray = [];
      selection.each(function (d) {
        d = zeroInjection(d);
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
    };

    // test if val is a number
    chart.isNumber = function (n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    };

    chart.iterateSelection = function (args) {
      if (typeof args === 'undefined') {
        args = {};
      }

      var data = zeroInjection(args.data),
        that = args.this,
        colors = args.colors,
        brush;

      // Data formatters
      xAxisFormatter = data.xAxisFormatter || function (v) {
        return v;
      };
      yAxisFormatter = data.yAxisFormatter;
      tooltipFormatter = data.tooltipFormatter;

      // adds the label value to each data point
      // within the values array for displaying in the tooltip
      data.series.forEach(function (d) {
        d.values.forEach(function (e) {
          var label = d.label ? d.label : data.yAxisLabel;
          e.label = label;
        });
      });

      // width, height, margins
      elemWidth = parseInt(d3.select(that)
        .style('width'), 10);
      elemHeight = parseInt(d3.select(that)
        .style('height'), 10);
      width = elemWidth - margin.left - margin.right; // width of the parent element ???
      height = elemHeight - margin.top - margin.bottom; // height of the parent element ???

      // preparing the data and scales
      dataLength = data.series[0].values.length;
      stack.offset(offset);
      layers = stack(data.series);
      n = layers.length; // number of layers
      globalYAxis = chart.globalYAxisFn(selection);
      yGroupMax = d3.max(layers, function (layer) {
        return d3.max(layer.values, function (d) {
          return d.y;
        });
      });
      yStackMax = d3.max(layers, function (layer) {
        return d3.max(layer.values, function (d) {
          return d.y0 + d.y;
        });
      });

      // need to check if number here
      keys = d3.set(layers[0].values.map(function (d) {
          return d.x;
        }))
        .values();

      for (var i = 0; i < keys.length; i++) {
        if (chart.isNumber(keys[i])) {
          keys[i] = +keys[i];
        }
      }

      /* Error Handler that prevents a chart from being rendered when
             there are too many data points for the width of the container. */
      if (width / dataLength <= 4) {
        throw new Error('chart too small');
      }

      /* ************************** DATE FORMAT *************************************************** */
      if (data.ordered !== undefined && data.ordered.date !== undefined) {
        var milsInterval = data.ordered.interval,
          testInterval, dateoffset;

        if (milsInterval < 2419200000) {
          testInterval = 'week';
          dateoffset = (milsInterval / 604800000);
        }
        if (milsInterval < 604800000) {
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
        var maxIntervalOffset = d3.time[testInterval].offset(new Date(data.ordered.max), dateoffset);
        var minIntervalOffset = d3.time[testInterval].offset(new Date(data.ordered.min), -dateoffset);

        xScale = d3.time.scale()
          .domain([minIntervalOffset, maxIntervalOffset])
          .range([0, width]);
      } else {
        xScale = d3.scale.ordinal()
          .domain(keys)
          .rangeRoundBands([0, width], 0.1);
      }
      /* ******************************************************************************************** */

      yScale = d3.scale.linear()
        .range([height, 0]);
      var xTickScale = d3.scale.linear()
        .clamp(true)
        .domain([80, 300, 800])
        .range([0, 2, 4]);
      var xTicks = Math.floor(xTickScale(width));

      xAxis = d3.svg.axis()
        .scale(xScale)
        .ticks(xTicks)
        .tickPadding(5)
        .tickFormat(xAxisFormatter)
        .orient('bottom');

      // tickScale uses height to get tickN value for ticks() and nice()
      var tickScale = d3.scale.linear()
        .clamp(true)
        .domain([20, 40, 1000])
        .range([0, 1, 10]),
        tickN = Math.floor(tickScale(height));

      yAxis = d3.svg.axis()
        .scale(yScale)
        .ticks(tickN)
        .tickPadding(4)
        .tickFormat(yAxisFormatter)
        .orient('left');

      // setting the y scale domain
      if (shareYAxis) {
        yScale.domain([0, globalYAxis])
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

      // maps color domain to range
      //color.domain([0, colDomain.length - 1]);

      // canvas
      var svg = d3.select(that)
        .append('svg')
        .attr('class', 'canvas')
        .attr('width', '100%')
        .attr('height', '100%')
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // background rect
      svg.append('rect')
        .attr('class', 'chart-bkgd')
        .attr('width', width)
        .attr('height', height);

      // x axis
      svg.append('g')
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
          scrolltop = document.body.scrollTop;

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
      svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

      // Axis labels
      svg.append('text')
        .attr('class', 'x-axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + 30)
        .text(data.xAxisLabel);

      svg.append('text')
        .attr('class', 'y-axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', -height / 2)
        .attr('y', function () {
          // get width of y axis group for label offset
          var ww = svg.select('.y.axis')
            .node()
            .getBBox();
          return -1 * ww.width - 14;
        })
        .attr('dy', '.75em')
        .attr('transform', 'rotate(-90)')
        .text(data.yAxisLabel);

      // Chart title
      svg.append('text')
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
          scrolltop = document.body.scrollTop;

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
      brush = d3.svg.brush()
        .x(xScale)
        .on('brushend', function brushend() {
          var selected, start, lastVal, end, selectedRange;

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
              config: args,
              e: d3.event,
              data: latestData
            }) :
            dispatch.brush({
              range: selectedRange,
              config: args,
              e: d3.event,
              data: latestData
            });
        });

      if (dispatch.on('brush')) {
        svg.append('g')
          .attr('class', 'brush')
          .call(brush)
          .selectAll('rect')
          .attr('height', height);
      }
      /* ************************** */

      // layers
      layer = svg.selectAll('.layer')
        .data(function (d) {
          return d.series;
        })
        .enter()
        .append('g')
        .attr('class', function (d) {
          if (!d.label) {
            return colors[data.yAxisLabel];
          } else {
            return colors[d.label];
          }

        })
        .style('fill', function (d) {
          if (!d.label) {
            return colors[data.yAxisLabel];
          } else {
            return colors[d.label];
          }

        });

      bars = layer.selectAll('rect')
        .data(function (d) {
          return d.values;
        });

      // enter
      bars.enter()
        .append('rect')
        .attr('class', function (d, i) {
          // Regex to remove ., /, white space, *, ;, (, ), :, , from labels.
          var label = d.label !== undefined ?
            d.label.replace(/[.]+|[/]+|[\s]+|[*]+|[;]+|[(]+|[)]+|[:]+|[,]+/g, '') :
            data.yAxisLabel.replace(/[.]+|[/]+|[\s]+|[*]+|[;]+|[(]+|[)]+|[:]+|[,]+/g, '');
          return 'rl rl-' + label;
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
            config: args,
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
            config: args,
            data: latestData,
            e: d3.event
          });

          d3.event.stopPropagation();
        });

      if (addTooltip) {
        // **** hilite series on hover
        allLayers = vis.selectAll('rect');
        var itm, itmRect, ht, ot, legendwrap = d3.select('.legendwrapper');
        //var allLayers = svg.selectAll('.rect');
        bars.on('mouseover', function (d) {

          // hilite chart layer
          allLayers.style('opacity', 0.3);
          var layerClass = '.rl-' + d.label.replace(/[.]+|[/]+|[\s]+|[*]+|[;]+|[(]+|[)]+|[:]+|[,]+/g, ''),
            mylayer = vis.selectAll(layerClass)
            .style('opacity', 1);

          // stroke this rect
          d3.select(this)
            .classed('hover', true)
            .style('stroke', '#333');
            // .style('cursor', 'pointer');

          var itm;

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
          scrolltop = document.body.scrollTop;

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
            return data.ordered === undefined || !data.ordered.date ?
              xScale.rangeBand() :
              xScale(data.ordered.min + data.ordered.interval) - xScale(data.ordered.min) - 2;
          })
          .attr('y', function (d) {
            return yScale(d.y0 + d.y);
          })
          .attr('height', function (d) {
            return yScale(d.y0) - yScale(d.y0 + d.y);
          });
        break;
      }

      // exit
      bars.exit()
        .remove();

      return svg;
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

    chart.margin = function (_) {
      if (!arguments.length) {
        return margin;
      }
      margin.top = typeof _.top !== 'undefined' ? _.top : margin.top;
      margin.right = typeof _.right !== 'undefined' ? _.right : margin.right;
      margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
      margin.left = typeof _.left !== 'undefined' ? _.left : margin.left;
      return chart;
    };

    chart.y = function (_) {
      if (!arguments.length) {
        return getY;
      }
      getY = _;
      return chart;
    };

    chart.x = function (_) {
      if (!arguments.length) {
        return getX;
      }
      getX = _;
      return chart;
    };

    chart.offset = function (_) {
      if (!arguments.length) {
        return offset;
      }
      offset = _;
      return chart;
    };

    chart.width = function (_) {
      if (!arguments.length) {
        return elemWidth;
      }
      elemWidth = _;
      return chart;
    };

    chart.height = function (_) {
      if (!arguments.length) {
        return elemHeight;
      }
      elemHeight = _;
      return chart;
    };

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

    chart.error = function () {
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
    };

    d3.rebind(chart, dispatch, 'on');
    d3.select(window)
      .on('resize', chart.resize);

    return chart;
  };
});
