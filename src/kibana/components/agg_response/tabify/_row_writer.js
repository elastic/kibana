define(function (require) {
  var _ = require('lodash');

  _(RowWriter).inherits(Array);
  function RowWriter(vis, rows, columns) {
    RowWriter.Super.call(this);

    this.vis = vis;
    this.rows = rows;
    this.columns = columns;
  }

  // copy the current cellts into the rows object, filling in or ignoring when appropriate
  RowWriter.prototype.write = function () {
    var vis = this.vis;
    var rows = this.rows;
    var columns = this.columns;

    if (this.length !== columns.length && !vis.isHierarchical()) {
      return;
    }

    var cells = this.slice(0);
    while (cells.length < columns.length) cells.push('');
    rows.push(cells);
  };


  return RowWriter;
});