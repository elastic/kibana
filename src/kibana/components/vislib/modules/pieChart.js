define(function (require) {

  var _ = require('lodash');
  var $ = require('jquery');
  var d3 = require('d3');

  var getSelection = require('components/vislib/utils/selection');
  var getLegend = require('components/vislib/modules/legend');
  var getColor = require('components/vislib/utils/colorspace');

  return function getPieChart(elem, config) {
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

          chart.createPieChart({
            'data': d,
            'index': i,
            'this': that,
            'colors': colors,
            'tip': tip
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
            label.values.forEach(function (value) {
              items.push(value.x);
            });
          });
        });

        items = _.uniq(items);
        return items;
      } catch (error) {
        console.group('chart.getColorDomain: ' + error);
      }
    };

    chart.createPieChart = function (args) {
      try {
        if (typeof args === 'undefined') {
          args = {};
        }

        var data = args.data;
        var that = args.this;
        var colors = args.colors;
        var tip = args.tip;
        var yAxisLabel = data.yAxisLabel;
        var chartLabel = data.label;
        var tooltipFormatter = data.tooltipFormatter;

        var elemWidth = parseInt(d3.select(that)
            .style('width'), 10);
        var elemHeight = parseInt(d3.select(that)
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
          };

        var width = elemWidth - margin.left - margin.right;
        var height = elemHeight - margin.top - margin.bottom;
        var radius = Math.min(width, height) / 2;

        var arc = d3.svg.arc()
          .outerRadius(radius - 10)
          .innerRadius(0);

        var pie = d3.layout.pie()
          .sort(null)
          .value(function (d) {
            return d.y;
          });

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
            d.label ? e.label = d.label : e.label = e.x;
          });
        });

        data.series.map(function (series) {
          seriesData.push(series);
        });
        /* ************************** */

        var svg = d3.select(that)
          .append('svg')
          .data(seriesData)
          .attr('class', 'canvas')
          .attr('width', '100%')
          .attr('height', '100%');

        // background rect
        svg.append('rect')
          .attr('class', 'chart-bkgd')
          .attr('width', width)
          .attr('height', height);

        var g = svg.append('g')
          .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

        // Chart title
        g.append('text')
          .attr('class', 'charts-label')
          .attr('text-anchor', 'middle')
          .attr('x', width / 2)
          .attr('y', -10)
          .text(chartLabel)
//          .call(chart.tickText, width)
//          .on('mouseover', function (d) {
//            if (addTooltip) {
//              var hh = tip[0][0].scrollHeight;
//
//              mousemove = {
//                left: d3.event.pageX,
//                top: d3.event.pageY
//              };
//
//              d3.select(that)
//                .style('cursor', 'default');
//
//              return tip.text(d.label)
//                .style('top', mousemove.top - scrolltop - hh / 2 + 'px')
//                .style('left', mousemove.left + 20 + 'px')
//                .style('visibility', 'visible');
//            }
//          })
//          .on('mouseout', function () {
//            d3.select(that)
//              .classed('hover', false)
//              .style('stroke', null);
//            if (addTooltip) {
//              tip.style('visibility', 'hidden');
//            }
//          });

        var wedge = g.selectAll('.arc')
          .data(function (d) {
            return pie(d.values);
          })
          .enter()
          .append('g')
          .attr('class', 'arc');

        wedge.append('path')
          .attr('d', arc)
          .attr('class', function (d) {
            return 'rl rl-' + chart.getClassName(d.data.label, yAxisLabel);
          })
          .style('fill', function (d) {
            return colors[d.data.x];
          })
          .on('mouseover', function (d, i) {
            var point = d3.select(this);
            var layerClass = '.rl-' + chart.getClassName(d.data.label, yAxisLabel);

            point.attr('opacity', 1)
              .classed('hover', true)
              .style('cursor', 'pointer');

            // highlight chart layer
            allLayers = vis.selectAll('.rl');
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
            var datum;
            var hh = tip[0][0].scrollHeight;

            mousemove = {
              left: d3.event.pageX,
              top: d3.event.pageY
            };
            scrolltop = document.body.scrollTop;

            if (typeof d.data.label !== 'undefined') {
              datum = {
                label: d.data.label,
                x: d.data.x,
                y: d.data.y
              };
            } else {
              datum = {
                x: d.data.x,
                y: d.data.y
              };
            }

            tip.datum(datum)
              .text(tooltipFormatter)
              .style('top', mousemove.top - scrolltop - hh / 2 + 'px')
              .style('left', mousemove.left + 20 + 'px')
              .style('visibility', 'visible');
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
            point.attr('opacity', 0.3);
            if (addTooltip) {
              tip.style('visibility', 'hidden');
            }
            allLayers.style('opacity', 1);
            allItms.style('opacity', 1);
          });

        if (addTooltip) {
          // **** hilite series on hover
//        allLayers = vis.selectAll('path');
          wedge.on('mouseover', function (d) {
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

//        wedge.append('text')
//          .attr('transform', function (d) {
//            return 'translate(' + arc.centroid(d) + ')';
//          })
//          .attr('dy', '.35em')
//          .style('text-anchor', 'middle')
//          .text(function (d) {
//            return d.data.x;
//          });

        return svg;
      } catch (error) {
        console.group('chart.createPieChart: ' + error);
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
