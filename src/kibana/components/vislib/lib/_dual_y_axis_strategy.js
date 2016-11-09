define(function (require) {
  return function DualYAxisStrategyService(d3) {
    var _ = require('lodash');
    var DualYAxisStrategy = function () {
    };

    /**
     * Return an array of all value objects
     * Pluck the data.series array from all data object which belongs to primary axis
     * Create an array of all the value objects from the series array
     *
     * @method _primaryAxisFlatten
     * @params chartData {Array} of actual y data value objects
     * @returns {Array} Value objects
     */
    DualYAxisStrategy.prototype._primaryAxisFlatten = function (chartData) {
      return _(chartData)
        .pluck('series')
        .flatten()
        .reject( function (series) {
          return series.onSecondaryYAxis;
        })
        .pluck('values')
        .flatten()
        .value();
    };

    DualYAxisStrategy.prototype._flatten = function (chartData, isPrimary) {
      return isPrimary ?
        this._primaryAxisFlatten(chartData) :
        this._secondaryAxisFlatten(chartData);
    };

    /**
     * Return an array of all value objects
     * Pluck the data.series array from all data object which belongs to secondary axis
     * Create an array of all the value objects from the series array
     *
     * @method _secondaryAxisFlatten
     * @params chartData {Array} of actual y data value objects
     * @returns {Array} Value objects
     */
    DualYAxisStrategy.prototype._secondaryAxisFlatten = function (chartData) {
      return _(chartData)
        .pluck('series')
        .flatten()
        .filter( function (series) {
          return series.onSecondaryYAxis;
        })
        .pluck('values')
        .flatten()
        .value();
    };

    /**
     * Returns data object after stamping all the y values in series
     * which belong to secondary axis
     *
     * @method decorate
     * @params data {Object} The object of class Data
     * @returns data object
     */
    DualYAxisStrategy.prototype.decorate = function (data) {
      if (data.rows) {
        _.map(data.rows, this._updateSeries, this);
      } else if (data.columns) {
        _.map(data.columns, this._updateSeries, this);
      } else {
        this._updateSeries(data);
      }
      return data;
    };

    DualYAxisStrategy.prototype._updateSeries = function (data) {
      if (data.series) {
        _.map(data.series, function (series) {
          var onSecondaryYAxis = series.onSecondaryYAxis;
          _.map(series.values, function (value) {
            value.belongsToSecondaryYAxis = onSecondaryYAxis;
          });
        });
      }
    };

    /**
     * Returns the Y axis value for a `series` array based on
     * a specified callback function (calculation) (Max/Min).
     */
    DualYAxisStrategy.prototype._getYExtent = function (extent, points) {
      return d3[extent](points);
    };

    /**
     * Calculates the highest Y value across all charts for primary Axis
     *
     * @method getYMax
     * @param {function} [getValue]
     * @param chartData {Array} of actual y data value objects
     * @param attr {Object} mode of the graph
     * @returns {Number} Max y axis value
     */
    DualYAxisStrategy.prototype.getYMax = function (getValue, chartData, attr) {
      if (attr.mode === 'percentage') {
        return 1;
      }

      return this._calculateYMax(chartData, true);
    };


    /**
     * Calculates the highest Y value for the chart on secondary Axis
     *
     * @method getSecondYMax
     * @param {function} [getValue]
     * @param chartData {Array} of actual y data value objects
     * @param attr {Object} mode of the graph
     * @returns {Number} Max y axis value
     */
    DualYAxisStrategy.prototype.getSecondYMax = function (getValue, chartData, attr) {
      if (attr.mode === 'percentage') {
        return 1;
      }

      return this._calculateYMax(chartData, false);
    };

    /**
     * Caluates the max Y value across the charts
     */
    DualYAxisStrategy.prototype._calculateYMax = function (chartData, isPrimary) {
      var self = this;
      var arr = [];
      var flatData = this._flatten(chartData, isPrimary);
      // if there is only one data point and its less than zero,
      // return 0 as the yMax value.
      if (!flatData.length || flatData.length === 1 && flatData[0].y < 0) {
        return 0;
      }

      var max = -Infinity;
      var points = _(flatData).pluck('y').value();

      // for each object in the dataArray,
      // push the calculated y value to the initialized array (arr)
      _.each(chartData, function (chart) {
        var calculatedMax = self._getYExtent('max', points);
        if (!_.isUndefined(calculatedMax)) {
          max = Math.max(max, calculatedMax);
        }
      });

      return max;
    };

    /**
     * Calculates the lowest Y value across all charts for primary Axis
     *
     * @method getYMin
     * @param {function} [getValue]
     * @param chartData {Array} of actual y data value objects
     * @param attr {Object} mode of the graph
     * @returns {Number} Min y axis value
     */
    DualYAxisStrategy.prototype.getYMin = function (getValue, chartData, attr) {
      var self = this;
      var arr = [];

      if (attr.mode === 'percentage' || attr.mode === 'wiggle' ||
        attr.mode === 'silhouette') {
        return 0;
      }

      return this._calculateYMin(chartData, true);
    };

    /**
     * Calculates the lowest Y value for the chart on secondary Axis
     *
     * @method getSecondYMin
     * @param {function} [getValue]
     * @param chartData {Array} of actual y data value objects
     * @param attr {Object} mode of the graph
     * @returns {Number} Min y axis value
     */
    DualYAxisStrategy.prototype.getSecondYMin = function (getValue, chartData, attr) {
      if (attr.mode === 'percentage' || attr.mode === 'wiggle' ||
        attr.mode === 'silhouette') {
        return 0;
      }

      return this._calculateYMin(chartData, false);
    };
    /**
     * Caluates the min Y value across the charts
     */
    DualYAxisStrategy.prototype._calculateYMin = function (chartData, isPrimary) {
      var self = this;
      var arr = [];
      var flatData = this._flatten(chartData, isPrimary);
      // if there is only one data point and its less than zero,
      // return 0 as the yMax value.
      if (!flatData.length || flatData.length === 1 && flatData[0].y > 0) {
        return 0;
      }

      var min = Infinity;
      var points = _(flatData).pluck('y').value();

      // for each object in the dataArray,
      // push the calculated y value to the initialized array (arr)
      _.each(chartData, function (chart) {
        var calculatedMin = self._getYExtent('min', points);
        if (!_.isUndefined(calculatedMin)) {
          min = Math.min(min, calculatedMin);
        }
      });
      return min;
    };

    return DualYAxisStrategy;
  };
});
