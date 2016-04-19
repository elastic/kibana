var d3 = require('d3');

function heatmapLayout() {
  var row = function (d) { return d.row; };
  var column = function (d) { return d.col; };
  var value = function (d) { return d.value; };
  var fill = value;
  var fillOpacity = value;
  var rowScale = d3.scale.linear();
  var columnScale = d3.scale.linear();
  var fillScale = d3.scale.linear();
  var opacityScale = d3.scale.linear().range([1, 1]);

  function layout(data) {
    return data.map(function (d, i) {
      return {
        row: row.call(data, d, i),
        col: column.call(data, d, i),
        value: value.call(data, d, i),
        data: {
          row: rowScale(row.call(data, d, i)),
          col: columnScale(column.call(data, d, i)),
          fill: fillScale(fill.call(data, d, i)),
          opacity: opacityScale(fillOpacity.call(data, d, i))
        }
      };
    });
  }

  // Public API
  layout.row = function (v) {
    if (!arguments.length) { return row; }
    row = v;
    return layout;
  };

  layout.column = function (v) {
    if (!arguments.length) { return column; }
    column = v;
    return layout;
  };

  layout.value = function (v) {
    if (!arguments.length) { return value; }
    value = v;
    return layout;
  };

  layout.fill = function (v) {
    if (!arguments.length) { return fill; }
    fill = v;
    return layout;
  };

  layout.fillOpacity = function (v) {
    if (!arguments.length) { return fillOpacity; }
    fillOpacity = v;
    return layout;
  };

  layout.rowScale = function (v) {
    if (!arguments.length) { return rowScale; }
    rowScale = v;
    return layout;
  };

  layout.columnScale = function (v) {
    if (!arguments.length) { return columnScale; }
    columnScale = v;
    return layout;
  };

  layout.fillScale = function (v) {
    if (!arguments.length) { return fillScale; }
    fillScale = v;
    return layout;
  };

  layout.opacityScale = function (v) {
    if (!arguments.length) { return opacityScale; }
    opacityScale = v;
    return layout;
  };

  return layout;
}

module.exports = heatmapLayout;
