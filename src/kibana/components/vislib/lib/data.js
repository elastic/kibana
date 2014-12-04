define(function (require) {
  return function DataFactory(d3, Private) {
    var _ = require('lodash');

    var injectZeros = Private(require('components/vislib/components/zero_injection/inject_zeros'));
    var orderKeys = Private(require('components/vislib/components/zero_injection/ordered_x_keys'));
    var getLabels = Private(require('components/vislib/components/labels/labels'));
    var color = Private(require('components/vislib/components/color/color'));

    /**
     * Provides an API for pulling values off the data
     * and calculating values using the data
     *
     * @class Data
     * @constructor
     * @param data {Object} Elasticsearch query results
     * @param attr {Object|*} Visualization options
     */
    function Data(data, attr) {
      if (!(this instanceof Data)) {
        return new Data(data, attr);
      }

      var offset;

      if (attr.mode === 'stacked') {
        offset = 'zero';
      } else if (attr.mode === 'percentage') {
        offset = 'expand';
      } else if (attr.mode === 'grouped') {
        offset = 'group';
      } else {
        offset = attr.mode;
      }

      this.data = data;
      this.type = this.getDataType();

      this.labels;

      if (this.type === 'series') {
        this.labels = getLabels(data);
      } else if (this.type === 'slices') {
        this.labels = this.pieNames();
      }

      this.color = this.labels ? color(this.labels) : undefined;
      
      this._normalizeOrdered();

      this._attr = _.defaults(attr || {}, {

        // d3 stack function
        stack: d3.layout.stack()
          .x(function (d) { return d.x; })
          .y(function (d) { return d.y; })
          .offset(offset || 'zero')
      });
    }

    Data.prototype.getDataType = function () {
      var data = this.getVisData();
      var type;

      data.forEach(function (obj) {
        if (obj.series) {
          type = 'series';
        } else if (obj.slices) {
          type = 'slices';
        }
      });

      return type;
    };

    /**
     * Returns an array of the actual x and y data value objects
     * from data with series keys
     *
     * @method chartData
     * @returns {*} Array of data objects
     */
    Data.prototype.chartData = function () {
      if (!this.data.series) {
        var arr = this.data.rows ? this.data.rows : this.data.columns;
        return _.pluck(arr);
      }
      return [this.data];
    };

    /**
     * Returns an array of chart data objects
     *
     * @method getVisData
     * @returns {*} Array of chart data objects
     */
    Data.prototype.getVisData = function () {
      var visData;

      if (this.data.rows) {
        visData = this.data.rows;
      } else if (this.data.columns) {
        visData = this.data.columns;
      } else {
        visData = [this.data];
      }

      return visData;
    };

    /**
     * Function to determine whether to display the legend or not
     * Displays legend when more than one series of data present
     *
     * @method isLegendShown
     * @returns {boolean}
     */
    Data.prototype.isLegendShown = function () {
      var isLegend = false;
      var visData = this.getVisData();
      var sameSeriesLabel = true;
      var seriesLabel;

      _.forEach(visData, function countSeriesLength(obj) {
        var rootSeries = obj.series || (obj.slices && obj.slices.children);
        var dataLength = rootSeries ? rootSeries.length : 0;
        var label = dataLength === 1 ? rootSeries[0].label || rootSeries[0].name : undefined;
        var children = (obj.slices && obj.slices.children && obj.slices.children[0] && obj.slices.children[0].children);

        if (!seriesLabel) {
          seriesLabel = label;
        }

        if (seriesLabel !== label) {
          sameSeriesLabel = false;
        }

        if (dataLength > 1 || children || !sameSeriesLabel) {
          isLegend = true;
        }
      });

      return isLegend;
    };

    /**
     * Returns array of chart data objects for pie data objects
     *
     * @method pieData
     * @returns {*} Array of chart data objects
     */
    Data.prototype.pieData = function () {
      if (!this.data.slices) {
        return this.data.rows ? this.data.rows : this.data.columns;
      }
      return [this.data];
    };

    /**
     * Get attributes off the data, e.g. `tooltipFormatter` or `xAxisFormatter`
     * pulls the value off the first item in the array
     * these values are typically the same between data objects of the same chart
     * TODO: May need to verify this or refactor
     *
     * @method get
     * @param thing {String} Data object key
     * @returns {*} Data object value
     */
    Data.prototype.get = function (thing) {
      var data;

      if (this.data.rows) {
        data = this.data.rows;
      } else if (this.data.columns) {
        data = this.data.columns;
      } else {
        data = [this.data];
      }

      return _.pluck(data, thing)[0];
    };

    /**
     * Return an array of all value objects
     * Pluck the data.series array from each data object
     * Create an array of all the value objects from the series array
     *
     * @method flatten
     * @returns {Array} Value objects
     */
    Data.prototype.flatten = function () {
      var data = this.chartData();
      var series = _.chain(data).pluck('series').pluck().value();
      var values = [];

      series.forEach(function (d) {
        values.push(_.chain(d).flatten().pluck('values').value());
      });

      return values;
    };

    /**
     * Determines whether histogram charts should be stacked
     * TODO: need to make this more generic
     *
     * @method shouldBeStacked
     * @param series {Array} Array of data objects
     * @returns {boolean}
     */
    Data.prototype.shouldBeStacked = function (series) {
      var isHistogram = (this._attr.type === 'histogram');
      var isArea = (this._attr.type === 'area');
      var isOverlapping = (this._attr.mode === 'overlap');

      // Series should be an array
      return (isHistogram || isArea && !isOverlapping && series.length > 1);
    };

    /**
     * Calculate the max y value from this.dataArray
     * for each object in the dataArray,
     * push the calculated y value to the initialized array (arr)
     * return the largest value from the array
     *
     * @method getYMaxValue
     * @returns {Number} Max y axis value
     */
    Data.prototype.getYMaxValue = function () {
      var self = this;
      var arr = [];
      var grouped = (self._attr.mode === 'grouped');

      if (self._attr.mode === 'percentage') {
        return 1;
      }

      // for each object in the dataArray,
      // push the calculated y value to the initialized array (arr)
      _.forEach(this.flatten(), function (series) {
        if (self.shouldBeStacked(series) && !grouped) {
          return arr.push(self.getYStackMax(series));
        }
        return arr.push(self.getYMax(series));
      });

      return _.max(arr);
    };

    /**
     * Calculates the stacked values for each data object
     *
     * @method stackData
     * @param series {Array} Array of data objects
     * @returns {*} Array of data objects with x, y, y0 keys
     */
    Data.prototype.stackData = function (series) {
      return this._attr.stack(series);
    };

    /**
     * Calculates the largest y stack value among all data objects
     *
     * @method getYStackMax
     * @param series {Array} Array of data objects
     * @returns {Number} Y stack max value
     */
    Data.prototype.getYStackMax = function (series) {
      var isOrdered = (this.data.ordered && this.data.ordered.date);
      var minDate = isOrdered ? this.data.ordered.min : undefined;
      var maxDate = isOrdered ? this.data.ordered.max : undefined;

      return d3.max(this.stackData(series), function (data) {
        return d3.max(data, function (d) {
          if (isOrdered) {
            return (d.x >= minDate && d.x <= maxDate) ? d.y0 + d.y : undefined;
          }

          return d.y0 + d.y;
        });
      });
    };

    /**
     * Calculates the Y domain max value
     *
     * @method getMax
     * @param series {Array} Array of data objects
     * @returns {Number} Y domain max value
     */
    Data.prototype.getYMax = function (series) {
      var isOrdered = (this.data.ordered && this.data.ordered.date);
      var minDate = isOrdered ? this.data.ordered.min : undefined;
      var maxDate = isOrdered ? this.data.ordered.max : undefined;

      return d3.max(series, function (data) {
        return d3.max(data, function (d) {
          if (isOrdered) {
            return (d.x >= minDate && d.x <= maxDate) ? d.y : undefined;
          }

          return d.y;
        });
      });
    };

    /**
     * Helper function for getNames
     * Returns an array of objects with a name (key) value and an index value.
     * The index value allows us to sort the names in the correct nested order.
     *
     * @method returnNames
     * @param array {Array} Array of data objects
     * @param index {Number} Number of times the object is nested
     * @param columns {Object} Contains name formatter information
     * @returns {Array} Array of labels (strings)
     */
    Data.prototype.returnNames = function (array, index, columns) {
      var names = [];
      var self = this;

      _.forEach(array, function (obj) {
        var fieldFormatter = obj.aggConfig ? obj.aggConfig.fieldFormatter() : String;
        names.push({ key: fieldFormatter(obj.name), index: index });

        if (obj.children) {
          var plusIndex = index + 1;

          _.forEach(self.returnNames(obj.children, plusIndex, columns), function (namedObj) {
            names.push(namedObj);
          });
        }
      });

      return names;
    };

    /**
     * Flattens hierarchical data into an array of objects with a name and index value.
     * The indexed value determines the order of nesting in the data.
     * Returns an array with names sorted by the index value.
     *
     * @method getNames
     * @param data {Object} Chart data object
     * @param columns {Object} Contains formatter information
     * @returns {Array} Array of names (strings)
     */
    Data.prototype.getNames = function (data, columns) {
      var slices = data.slices;

      if (slices.children) {
        var namedObj = this.returnNames(slices.children, 0, columns);

        return _(namedObj)
        .sortBy(function (obj) {
          return obj.index;
        })
        .pluck('key')
        .unique()
        .value();
      }
    };

    /**
     * Returns an array of names ordered by appearance in the nested array
     * of objects
     *
     * @method pieNames
     * @returns {Array} Array of unique names (strings)
     */
    Data.prototype.pieNames = function () {
      var self = this;
      var names = [];

      _.forEach(this.getVisData(), function (obj) {
        var columns = obj.raw ? obj.raw.columns : undefined;

        _.forEach(self.getNames(obj, columns), function (name) {
          names.push(name);
        });
      });

      return _.uniq(names);
    };

    /**
     * Inject zeros into the data
     *
     * @method injectZeros
     * @returns {Object} Data object with zeros injected
     */
    Data.prototype.injectZeros = function () {
      return injectZeros(this.data);
    };

    /**
     * Returns an array of all x axis values from the data
     *
     * @method xValues
     * @returns {Array} Array of x axis values
     */
    Data.prototype.xValues = function () {
      return orderKeys(this.data);
    };

    /**
     * Return an array of unique labels
     * Curently, only used for vertical bar and line charts,
     * or any data object with series values
     *
     * @method getLabels
     * @returns {Array} Array of labels (strings)
     */
    Data.prototype.getLabels = function () {
      return getLabels(this.data);
    };

    /**
     * Returns a function that does color lookup on labels
     *
     * @method getColorFunc
     * @returns {Function} Performs lookup on string and returns hex color
     */
    Data.prototype.getColorFunc = function () {
      return color(this.getLabels());
    };

    /**
     * Returns a function that does color lookup on names for pie charts
     *
     * @method getPieColorFunc
     * @returns {Function} Performs lookup on string and returns hex color
     */
    Data.prototype.getPieColorFunc = function () {
      return color(this.pieNames());
    };

    /**
     * ensure that the datas ordered property has a min and max
     * if the data represents an ordered date range.
     *
     * @return {undefined}
     */
    Data.prototype._normalizeOrdered = function () {
      if (!this.data.ordered || !this.data.ordered.date) return;

      var missingMin = this.data.ordered.min == null;
      var missingMax = this.data.ordered.max == null;

      if (missingMax || missingMin) {
        var extent = d3.extent(this.xValues());
        if (missingMin) this.data.ordered.min = extent[0];
        if (missingMax) this.data.ordered.max = extent[1];
      }
    };

    /**
     * Calculates min and max values for all map data
     * series.rows is an array of arrays
     * each row is an array of values
     * last value in row array is bucket count
     * 
     * @method mapDataExtents
     * @param series {Array} Array of data objects
     * @returns {Array} min and max values
     */
    Data.prototype.mapDataExtents = function (series) {
      var values;
      values = _.map(series.rows, function (row) {
        return row[row.length - 1];
      });
      var extents = [_.min(values), _.max(values)];
      return extents;
    };

    return Data;
  };
});
