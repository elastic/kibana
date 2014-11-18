define(function (require) {
  return function PointSeriesSeriesSet() {
    var _ = require('lodash');

    function createSeriesSet(chart, col, index) {
      return new SeriesSet(chart, col, index);
    }

    function SeriesSet(chart, col, index) {
      this.sCol = col.series;
      this.sIndex = index.series;
      this.chart = chart;

      this.multiValue = _.isArray(col.y);
      this.multiSeries = this.multiValue || Boolean(this.sCol);

      if (!chart.series) chart.series = [];
      if (this.multiSeries) this._index = {};
    }

    /**
     * Get the name of the series we should write to, based on
     * the current row, and the current y value we are writing
     *
     * @param  {array} row - array of values that make up this row
     * @param  {object} [yCol] - optional column that we are currently reading
     * @return {string} - the name of the series to write to
     */
    SeriesSet.prototype.getName = function (row, yCol) {
      var name = '';
      // if (this.sCol) name += this.sCol.title;

      if (this.sIndex && name) name += ': ';
      if (this.sIndex) name += row[this.sIndex].value;

      if (yCol && name) name += ': ';
      if (yCol) name += yCol.title;
      return name;
    };


    /**
     * Get or create a series, determined by getSeriesName()
     *
     * @param  {array} row - array of values that make up this row
     * @param  {object} [yCol] - optional column that we are currently reading
     * @return {array} - the series to write values into
     */
    SeriesSet.prototype.get = function (row, yCol) {
      var s;
      var chart = this.chart;
      var index = this._index;

      if (index) {
        var seriesName = this.getName(row, yCol);
        // there is a series splitting agg defined
        s = index[seriesName];
        if (!s) {
          s = index[seriesName] = {
            label: seriesName,
            values: []
          };
          chart.series.push(s);
        }
      }

      if (!s) s = chart.series[0];
      if (!s) {
        s = {
          values: []
        };
        chart.series.push(s);
      }

      return s;
    };

    return createSeriesSet;
  };
});