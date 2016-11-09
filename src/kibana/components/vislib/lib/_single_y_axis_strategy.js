define(function (require) {
  return function SingleYAxisStrategyService(d3) {
    var _ = require('lodash');
    var SingleYAxisStrategy = function () {
    };

    /**
     * Return an array of all value objects
     * Pluck the data.series array from each data object
     * Create an array of all the value objects from the series array
     *
     * @method flatten
     * @returns {Array} Value objects
     */
    SingleYAxisStrategy.prototype._flatten = function (chartData) {
      return _(chartData)
      .pluck('series')
      .flatten()
      .pluck('values')
      .flatten()
      .value();
    };

    SingleYAxisStrategy.prototype.decorate = function (data) {
      if (data.series) {
        _.map(data.series, function (series) {
          _.map(series.values, function (value) {
            value.belongsToSecondaryYAxis = false;
          });
        });
      }
      return data;
    };

    /**
     * Returns the max Y axis value for a `series` array based on
     * a specified callback function (calculation).
     * @param chart {Object} - data for each chart
     * @param extent {String} - max/min
     * @param {function} [getValue] - Optional getter that will be used to read
     *                              values from points when calculating the extent.
     *                              default is either this._getYStack or this.getY
     *                              based on this.shouldBeStacked().
     * @param attr {Object} - properties for the chart
     */
    SingleYAxisStrategy.prototype._getYExtent = function (chart, extent, getValue, attr) {
      if (this.shouldBeStacked(attr)) {
        this.stackData(_.pluck(chart.series, 'values'), attr);
        getValue = getValue || this._getYStack;
      } else {
        getValue = getValue || this._getY;
      }

      var points = chart.series
      .reduce(function (points, series) {
        return points.concat(series.values);
      }, [])
      .map(getValue);

      return d3[extent](points);
    };

    /**
     * Calculates the y stack value for each data object
     */
    SingleYAxisStrategy.prototype._getYStack = function (d) {
      return d.y0 + d.y;
    };

    /**
     * Determines whether histogram charts should be stacked
     * TODO: need to make this more generic
     *
     * @method shouldBeStacked
     * @returns {boolean}
     */
    SingleYAxisStrategy.prototype.shouldBeStacked = function (attr) {
      var isHistogram = (attr.type === 'histogram');
      var isArea = (attr.type === 'area');
      var isOverlapping = (attr.mode === 'overlap');
      var grouped = (attr.mode === 'grouped');

      var stackedHisto = isHistogram && !grouped;
      var stackedArea = isArea && !isOverlapping;

      return stackedHisto || stackedArea;
    };

    /**
     * Calculates the Y max value
     */
    SingleYAxisStrategy.prototype._getY = function (d) {
      return d.y;
    };

    /**
     * Calculates the stacked values for each data object
     *
     * @method stackData
     * @param series {Array} Array of data objects
     * @returns {*} Array of data objects with x, y, y0 keys
     */
    SingleYAxisStrategy.prototype.stackData = function (series, attr) {
      // Should not stack values on line chart
      if (attr.type === 'line') return series;
      return attr.stack(series);
    };

    /**
     * Calculates the highest Y value across all charts, taking
     * stacking into consideration.
     *
     * @method getYMax
     * @param {function} [getValue] - optional getter that will receive a
     *                              point and should return the value that should
     *                              be considered
     * @param chartData {Array} of actual y data value objects
     * @param attr {Object} mode of the graph
     * @returns {Number} Max y axis value
     */
    SingleYAxisStrategy.prototype.getYMax = function (getValue, chartData, attr) {
      var self = this;
      var arr = [];

      if (attr.mode === 'percentage') {
        return 1;
      }

      var flat = this._flatten(chartData);
      // if there is only one data point and its less than zero,
      // return 0 as the yMax value.
      if (!flat.length || flat.length === 1 && flat[0].y < 0) {
        return 0;
      }

      var max = -Infinity;

      // for each object in the dataArray,
      // push the calculated y value to the initialized array (arr)
      _.each(chartData, function (chart) {
        var calculatedMax = self._getYExtent(chart, 'max', getValue, attr);
        if (!_.isUndefined(calculatedMax)) {
          max = Math.max(max, calculatedMax);
        }
      });

      return max;
    };

    /**
     * Calculates the lowest Y value across all charts, taking
     * stacking into consideration.
     *
     * @method getYMin
     * @param {function} [getValue] - optional getter that will receive a
     *                              point and should return the value that should
     *                              be considered
     * @param chartData {Array} of actual y data value objects
     * @param attr {Object} mode of the graph
     * @returns {Number} Min y axis value
     */
    SingleYAxisStrategy.prototype.getYMin = function (getValue, chartData, attr) {
      var self = this;
      var arr = [];

      if (attr.mode === 'percentage' || attr.mode === 'wiggle' ||
        attr.mode === 'silhouette') {
        return 0;
      }

      var flat = this._flatten(chartData);
      // if there is only one data point and its less than zero,
      // return 0 as the yMax value.
      if (!flat.length || flat.length === 1 && flat[0].y > 0) {
        return 0;
      }

      var min = Infinity;

      // for each object in the dataArray,
      // push the calculated y value to the initialized array (arr)
      _.each(chartData, function (chart) {
        var calculatedMin = self._getYExtent(chart, 'min', getValue, attr);
        if (!_.isUndefined(calculatedMin)) {
          min = Math.min(min, calculatedMin);
        }
      });

      return min;
    };
    return SingleYAxisStrategy;
  };
});
