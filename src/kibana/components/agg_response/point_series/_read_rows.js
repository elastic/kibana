define(function (require) {
  return function PointSeriesReadRows(Private) {
    var _ = require('lodash');
    var createSeriesSet = Private(require('components/agg_response/point_series/_series_set'));

    function readRows(table, index, chart, col, invoke) {
      var mutliValue = _.isArray(col.y);
      var seriesSet = invoke(createSeriesSet);

      if (!mutliValue) {
        var yIndex = index.y;
        table.rows.forEach(function (row) { write(row, yIndex); });
        return;
      }

      var yIndexes = index.y;
      var yCols = col.y;
      table.rows.forEach(function (row) {
        yIndexes.forEach(function (yIndex, yPos) {
          write(row, yIndex, yCols[yPos]);
        });
      });

      /**
       * Write a point to a series, determined by getSeries()
       *
       * @param  {array} row - the row to pull values from
       * @param  {number} yIndex - the index within the row, of the current y value we are writing
       * @param  {object} yCol - the column for the current y value
       * @return {undefined}
       */
      function write(row, yIndex, yCol) {
        var yResult = row[yIndex];
        var y = yResult.value;
        if (y == null) return;

        // scale y values based on the chart's yScale (determined by aggs)
        if (chart.yScale) {
          y = y * chart.yScale;
        }

        var xResult = row[index.x];
        var x = (xResult == null) ? '_all' : xResult.value;

        seriesSet.get(row, yCol).values.push({
          x: x,
          y: y,
          aggConfigResult: yResult
        });
      }
    }

    return readRows;
  };
});
