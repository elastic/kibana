var d3 = require('d3');
var _ = require('lodash');
var axis = require('plugins/heatmap/vis/components/axis/axis');
var colorbrewer = require('plugins/heatmap/vis/components/colorbrewer/colorbrewer');
var gGenerator = require('plugins/heatmap/vis/components/elements/g');
var layout = require('plugins/heatmap/vis/components/visualization/heatmap_layout');
var legendGenerator = require('plugins/heatmap/vis/components/legend/legend');
var rect = require('plugins/heatmap/vis/components/elements/rect');
var valuator = require('plugins/heatmap/vis/components/utils/valuator');

function heatmap() {
  var accessor = function (d) { return d; };
  var width = 960;
  var height = 500;
  var margin = { top: 20, right: 20, bottom: 20, left: 50 };
  var rowValue = function (d) { return d.row; };
  var colValue = function (d) { return d.col; };
  var metric = function (d) { return d.value; };
  var cAxis = { title: '', filterBy: 0, rotateLabels: true, rotationAngle: '-45' };
  var rAxis = { title: '', filterBy: 0, rotateLabels: true, rotationAngle: '-30'};
  var padding = 0;
  // var sort = { row: false, col: false };
  // var reverse = { row: false, col: false };
  var cellClass = 'cell';
  var colorScale = d3.scale.quantile();
  var colors = "PuBuGn";
  var numberOfColors = 6;
  var opacityScale = d3.scale.linear();
  var opacityRange = [1, 1];
  var fill = metric;
  var fillOpacity = metric;
  var stroke = 'none';
  var strokeWidth = 0;
  var legendTitle = 'Legend';
  var legendNumberFormat = 'number';
  var gridLayout = layout();
  var columnAxis = axis();
  var rowAxis = axis();
  var cells = rect();
  var legend = legendGenerator();
  var g = gGenerator();

  // Creates a unique array of items
  function getDomain(data, accessor) {
    return data
      .map(function (item) {
        return accessor.call(this, item);
      })
      .filter(function (item, index, array) {
        return array.indexOf(item) === index;
      });
  }

  function chart(selection) {
    selection.each(function (data, index) {
      var metrics = accessor.call(this, data, index);
      var adjustedWidth = width - margin.left - margin.right;
      var adjustedHeight = height - margin.top - margin.bottom;
      var colDomain = getDomain(metrics, colValue);
      var rowDomain = getDomain(metrics, rowValue);
      var colorRange = colorbrewer[colors][numberOfColors];
      var colorDomain = [0, Math.max(d3.max(metrics, metric), 1)];
      var columnScale = d3.scale.ordinal()
        .domain(colDomain)
        .rangeBands([0, adjustedWidth], padding);
      var rowScale = d3.scale.ordinal()
        .domain(rowDomain)
        .rangeBands([0, adjustedHeight], padding);
      var container;

      gridLayout
        .row(rowValue)
        .column(colValue)
        .value(metric)
        .columnScale(columnScale)
        .rowScale(rowScale)
        .fill(fill)
        .fillScale(colorScale.domain(colorDomain).range(colorRange))
        .fillOpacity(fillOpacity)
        .opacityScale(opacityScale.domain(colorDomain).range(opacityRange));

      columnAxis
        .scale(columnScale)
        .class('column')
        .orientation('bottom')
        .transform('translate(0,' + adjustedHeight + ')')
        .ticks({
          values: columnScale.domain().filter(function (d, i) {
            return !(i % cAxis.filterBy);
          })
        })
        .title({
          x: adjustedWidth / 2,
          y: margin.bottom * (2 / 3),
          anchor: 'middle',
          text: cAxis.title
        })
        .rotateLabels(cAxis.rotateLabels)
        .rotateOptions({
          transform: 'translate(0,0)rotate(' + cAxis.rotationAngle + ')'
        });

      rowAxis
        .scale(rowScale)
        .class('row')
        .ticks({
          values: rowScale.domain().filter(function (d, i) {
            return !(i % rAxis.filterBy);
          })
        })
        .title({
          transform: 'rotate(-90)',
          x: -adjustedHeight / 2,
          y: -margin.left * (8 / 9),
          anchor: 'middle',
          text: rAxis.title
        })
        .rotateLabels(rAxis.rotateLabels)
        .rotateOptions({
          transform: 'translate(-10,-8)rotate(' + rAxis.rotationAngle + ')',
          measure: 'height'
        });

      cells
        .class(cellClass)
        .x(function (d) { return d.data.col; })
        .y(function (d) { return d.data.row; })
        .width(columnScale.rangeBand())
        .height(rowScale.rangeBand())
        .fill(function (d) { return d.data.fill; })
        .fillOpacity(function (d) { return d.data.opacity; })
        .stroke(stroke)
        .strokeWidth(strokeWidth);

      legend
        .transform(function () {
          var x = adjustedWidth + (margin.right / 9);
          var y = adjustedHeight - Math.floor(adjustedHeight * (2 / 3));
          return 'translate(' + x + ',' + y + ')';
        })
        .scale(colorScale)
        .numberFormat(legendNumberFormat)
        .title(legendTitle);

      g.cssClass('container')
        .transform('translate(' + margin.left + ',' + margin.top + ')');

      container = d3.select(this)
        .datum([{}])
        .call(g) // One container to rule them all!
        .select('g.container');

      // Draw Heatmap Chart
      container
        .datum(gridLayout(metrics))
        .call(columnAxis)
        .call(rowAxis)
        .call(cells);

      // Legend
      container
        .datum([Math.min(0, colorScale.domain()[0])].concat(colorScale.quantiles()).concat(colorScale.domain()[1]))
        .call(legend);
    });
  }

  // Public API
  chart.accessor = function (v) {
    if (!arguments.length)  { return accessor; }
    accessor = valuator(v);
    return chart;
  };

  chart.width = function (v) {
    if (!arguments.length)  { return width; }
    width = v;
    return chart;
  };

  chart.height = function (v) {
    if (!arguments.length)  { return height; }
    height = v;
    return chart;
  };

  chart.margin = function (v) {
    if (!arguments.length) { return margin; }
    margin.top = typeof v.top !== 'undefined' ? v.top : margin.top;
    margin.right = typeof v.right !== 'undefined' ? v.right : margin.right;
    margin.bottom = typeof v.bottom !== 'undefined' ? v.bottom : margin.bottom;
    margin.left = typeof v.left !== 'undefined' ? v.left : margin.left;
    return chart;
  };

  chart.row = function (v) {
    if (!arguments.length)  { return rowValue; }
    rowValue = valuator(v);
    return chart;
  };

  chart.column = function (v) {
    if (!arguments.length)  { return colValue; }
    colValue = valuator(v);
    return chart;
  };

  chart.value = function (v) {
    if (!arguments.length) { return metric; }
    metric = valuator(v);
    return chart;
  };

  chart.columnAxis = function (v) {
    if (!arguments.length) { return cAxis; }
    cAxis.title = typeof v.title !== 'undefined' ? v.title : cAxis.title;
    cAxis.filterBy = typeof v.filterBy !== 'undefined' ? v.filterBy : cAxis.filterBy;
    return chart;
  };

  chart.rowAxis = function (v) {
    if (!arguments.length) { return rAxis; }
    rAxis.title = typeof v.title !== 'undefined' ? v.title : rAxis.title;
    rAxis.filterBy = typeof v.filterBy !== 'undefined' ? v.filterBy : rAxis.filterBy;
    return chart;
  };

  chart.padding = function (v) {
    if (!arguments.length) { return padding; }
    padding = v;
    return chart;
  };

  chart.class = function (v) {
    if (!arguments.length) { return cellClass; }
    cellClass = v;
    return chart;
  };

  chart.colorScale = function (v) {
    if (!arguments.length) { return colorScale; }
    colorScale = v;
    return chart;
  };

  chart.color = function (v) {
    if (!arguments.length) { return colors; }
    colors = v;
    return chart;
  };

  chart.numberOfColors = function (v) {
    if (!arguments.length) { return numberOfColors; }
    numberOfColors = v;
    return chart;
  };

  chart.opacityScale = function (v) {
    if (!arguments.length) { return opacityScale; }
    opacityScale = v;
    return chart;
  };

  chart.opacityRange = function (v) {
    if (!arguments.length) { return opacityRange; }
    opacityRange = v;
    return chart;
  };

  chart.fill = function (v) {
    if (!arguments.length) { return fill; }
    fill = v;
    return chart;
  };

  chart.fillOpacity = function (v) {
    if (!arguments.length) { return fillOpacity; }
    fillOpacity = v;
    return chart;
  };

  chart.stroke = function (v) {
    if (!arguments.length) { return stroke; }
    stroke = v;
    return chart;
  };

  chart.strokeWidth = function (v) {
    if (!arguments.length) { return strokeWidth; }
    strokeWidth = v;
    return chart;
  };

  chart.legendTitle = function (v) {
    if (!arguments.length) { return legendTitle; }
    legendTitle = v;
    return chart;
  };

  chart.legendNumberFormat = function (v) {
    if (!arguments.length) { return legendNumberFormat; }
    legendNumberFormat = v;
    return chart;
  };

  return chart;
}

module.exports = heatmap;
