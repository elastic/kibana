define(function (require) {
  return function DataFactory(d3, Private) {
    var _ = require('lodash');

    var injectZeros = Private(require('components/vislib/components/zero_injection/inject_zeros'));
    var orderKeys = Private(require('components/vislib/components/zero_injection/ordered_x_keys'));
    var getLabels = Private(require('components/vislib/components/labels/labels'));
    var color = Private(require('components/vislib/components/color/color'));
    var errors = require('errors');

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

      var self = this;
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
      this.color;

      if (this.type === 'series') {
        var labels = getLabels(data);
        var matchEmptyToFirst = false;
        if (labels.length === 1 && labels[0] === '') {
          this.labels = [(this.get('yAxisLabel'))];
          matchEmptyToFirst = true;
        } else {
          this.labels = labels;
        }
        this.color = this.labels ? color(this.labels, matchEmptyToFirst) : undefined;
      } else if (this.type === 'slices') {
        var flatAndNested = this.pieNames();
        this.labels = flatAndNested.nestedNames;
        this.color = color(flatAndNested.flatNames);
      }

      this._normalizeOrdered();

      this._attr = _.defaults(attr || {}, {
        stack: d3.layout.stack()
          .x(function (d) { return d.x; })
          .y(function (d) {
            if (offset === 'expand') {
              return Math.abs(d.y);
            }
            return d.y;
          })
          .offset(offset || 'zero')
      });

      if (attr.mode === 'stacked' && attr.type === 'histogram') {
        this._attr.stack.out(function (d, y0, y) {
          return self._stackNegAndPosVals(d, y0, y);
        });
      }
    }

    /**
     * Returns true for positive numbers
     */
    Data.prototype._isPositive = function (num) {
      return num >= 0;
    };

    /**
     * Returns true for negative numbers
     */
    Data.prototype._isNegative = function (num) {
      return num < 0;
    };

    /**
     * Adds two input values
     */
    Data.prototype._addVals = function (a, b) {
      return a + b;
    };

    /**
     * Returns the results of the addition of numbers in a filtered array.
     */
    Data.prototype._sumYs = function (arr, callback) {
      var filteredArray = arr.filter(callback);

      return (filteredArray.length) ? filteredArray.reduce(this._addVals) : 0;
    };

    /**
     * Calculates the d.y0 value for stacked data in D3.
     */
    Data.prototype._calcYZero = function (y, arr) {
      if (y >= 0) return this._sumYs(arr, this._isPositive);
      return this._sumYs(arr, this._isNegative);
    };

    /**
     *
     */
    Data.prototype._getCounts = function (i, j) {
      var data = this.chartData();
      var dataLengths = {};

      dataLengths.charts = data.length;
      dataLengths.stacks = data[i].series.length;
      dataLengths.values = data[i].series[j].values.length;

      return dataLengths;
    };

    /**
     *
     */
    Data.prototype._createCache = function () {
      var cache = {
        index: {
          chart: 0,
          stack: 0,
          value: 0
        },
        yValsArr: []
      };

      cache.count = this._getCounts(cache.index.chart, cache.index.stack);

      return cache;
    };

    /**
     * Stacking function passed to the D3 Stack Layout `.out` API.
     * See: https://github.com/mbostock/d3/wiki/Stack-Layout
     * It is responsible for calculating the correct d.y0 value for
     * mixed datasets containing both positive and negative values.
     */
    Data.prototype._stackNegAndPosVals = function (d, y0, y) {
      var data = this.chartData();

      // Storing counters and data characteristics needed to stack values properly
      if (!this._cache) {
        this._cache = this._createCache();
      }

      d.y0 = this._calcYZero(y, this._cache.yValsArr);
      ++this._cache.index.stack;


      // last stack, or last value, reset the stack count and y value array
      var lastStack = (this._cache.index.stack >= this._cache.count.stacks);
      if (lastStack) {
        this._cache.index.stack = 0;
        ++this._cache.index.value;
        this._cache.yValsArr = [];
      // still building the stack collection, push v value to array
      } else if (y !== 0) {
        this._cache.yValsArr.push(y);
      }

      // last value, prepare for the next chart, if one exists
      var lastValue = (this._cache.index.value >= this._cache.count.values);
      if (lastValue) {
        this._cache.index.value = 0;
        ++this._cache.index.chart;

        // no more charts, reset the queue and finish
        if (this._cache.index.chart >= this._cache.count.charts) {
          this._cache = this._createCache();
          return;
        }

        // get stack and value count for next chart
        this._cache.count.stacks = data[this._cache.index.chart].series.length; // number of stack layers
        this._cache.count.values = data[this._cache.index.chart].series[this._cache.index.stack].values.length; // number of values
      }
    };

    Data.prototype.getDataType = function () {
      var data = this.getVisData();
      var type;

      data.forEach(function (obj) {
        if (obj.series) {
          type = 'series';
        } else if (obj.slices) {
          type = 'slices';
        } else if (obj.geoJson) {
          type = 'geoJson';
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
      return _(this.chartData())
      .pluck('series')
      .flatten()
      .pluck('values')
      .flatten()
      .value();
    };

    /**
     * Determines whether histogram charts should be stacked
     * TODO: need to make this more generic
     *
     * @method shouldBeStacked
     * @returns {boolean}
     */
    Data.prototype.shouldBeStacked = function () {
      var isHistogram = (this._attr.type === 'histogram');
      var isArea = (this._attr.type === 'area');
      var isOverlapping = (this._attr.mode === 'overlap');
      var grouped = (this._attr.mode === 'grouped');

      var stackedHisto = isHistogram && !grouped;
      var stackedArea = isArea && !isOverlapping;

      return stackedHisto || stackedArea;
    };

    /**
     * Validates that the Y axis min value defined by user input
     * is a number.
     *
     * @param val {Number} Y axis min value
     * @returns {Number} Y axis min value
     */
    Data.prototype.validateUserDefinedYMin = function (val) {
      if (!_.isNumber(val)) {
        throw new Error('validateUserDefinedYMin expects a number');
      }
      return val;
    };

    /**
     * Calculates the lowest Y value across all charts, taking
     * stacking into consideration.
     *
     * @method getYMin
     * @param {function} [getValue] - optional getter that will receive a
     *                              point and should return the value that should
     *                              be considered
     * @returns {Number} Min y axis value
     */
    Data.prototype.getYMin = function (getValue) {
      var self = this;
      var arr = [];

      if (this._attr.mode === 'percentage' || this._attr.mode === 'wiggle' ||
        this._attr.mode === 'silhouette') {
        return 0;
      }

      var flat = this.flatten();
      // if there is only one data point and its less than zero,
      // return 0 as the yMax value.
      if (!flat.length || flat.length === 1 && flat[0].y > 0) {
        return 0;
      }

      var min = Infinity;

      // for each object in the dataArray,
      // push the calculated y value to the initialized array (arr)
      _.each(this.chartData(), function (chart) {
        min = Math.min(min, self._getYExtent(chart, 'min', getValue));
      });

      return min;
    };

    /**
     * Calculates the highest Y value across all charts, taking
     * stacking into consideration.
     *
     * @method getYMax
     * @param {function} [getValue] - optional getter that will receive a
     *                              point and should return the value that should
     *                              be considered
     * @returns {Number} Max y axis value
     */
    Data.prototype.getYMax = function (getValue) {
      var self = this;
      var arr = [];

      if (self._attr.mode === 'percentage') {
        return 1;
      }

      var flat = this.flatten();
      // if there is only one data point and its less than zero,
      // return 0 as the yMax value.
      if (!flat.length || flat.length === 1 && flat[0].y < 0) {
        return 0;
      }

      var max = -Infinity;

      // for each object in the dataArray,
      // push the calculated y value to the initialized array (arr)
      _.each(this.chartData(), function (chart) {
        max = Math.max(max, self._getYExtent(chart, 'max', getValue));
      });

      return max;
    };

    /**
     * Calculates the stacked values for each data object
     *
     * @method stackData
     * @param series {Array} Array of data objects
     * @returns {*} Array of data objects with x, y, y0 keys
     */
    Data.prototype.stackData = function (series) {
      // SHould not stack values on line chart
      if (this._attr.type === 'line') return series;
      return this._attr.stack(series);
    };

    /**
     * Returns the max Y axis value for a `series` array based on
     * a specified callback function (calculation).
     * @param {function} [getValue] - Optional getter that will be used to read
     *                              values from points when calculating the extent.
     *                              default is either this._getYStack or this.getY
     *                              based on this.shouldBeStacked().
     */
    Data.prototype._getYExtent = function (chart, extent, getValue) {
      if (this.shouldBeStacked()) {
        this.stackData(_.pluck(chart.series, 'values'));
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
    Data.prototype._getYStack = function (d) {
      return d.y0 + d.y;
    };

    /**
     * Calculates the Y max value
     */
    Data.prototype._getY = function (d) {
      return d.y;
    };

    /**
     * Helper function for getHierarchyNames
     * Returns a nested set of objects that contain the hierarchical relationship. Each object contains
     * the name, the children, and a data object that has the size and depth for sorting
     * purposes.
     *
     * @method returnHierarchyNames
     * @param array {Array} Array of data objects
     * @param depth {Number} Number of times the object is nested
     * @returns {Array} Array of objects with children
     */
    Data.prototype.returnHierarchyNames = function (array, depth) {
      var hierarchyNames = [];
      var self = this;

      _.forEach(array, function (obj) {
        var fieldFormatter = obj.aggConfig ? obj.aggConfig.fieldFormatter() : String;
        var name = fieldFormatter(obj.name);
        var hierarchyName = {name: name, depth: depth, children: []};

        if (obj.children) {
          var plusDepth = depth + 1;

          hierarchyName.children = self.returnHierarchyNames(obj.children, plusDepth);
        }
        hierarchyNames.push(hierarchyName);
      });

      return hierarchyNames;
    };

    /**
     * Returns a nested set of objects that contain the hierarchical relationship. Each object contains
     * the name, the children, and a data object that has the size and depth for sorting
     * purposes.
     *
     * @method getHierarchyNames
     * @param data {Object} Chart data object
     * @returns {Object} Nested set of objects
     */
    Data.prototype.getHierarchyNames = function (data) {
      var slices = data.slices;

      if (slices.children) {
        return this.returnHierarchyNames(slices.children, 0);
      }
    };

    /**
     * Checks whether all pie slices have zero values.
     * If so, an error is thrown.
     */
    Data.prototype._validatePieData = function () {
      var visData = this.getVisData();

      visData.forEach(function (chartData) {
        chartData.slices = (function withoutZeroSlices(slices) {
          if (!slices.children) return slices;

          slices = _.clone(slices);
          slices.children = slices.children.reduce(function (children, child) {
            if (child.size !== 0) {
              children.push(withoutZeroSlices(child));
            }
            return children;
          }, []);
          return slices;
        }(chartData.slices));

        if (chartData.slices.children.length === 0) {
          throw new errors.PieContainsAllZeros();
        }
      });
    };

    /**
     * Merges two object hierarchy of names into finalHierarchyNames.
     * Also grabs a list of names and depth pairs
     *
     * @method _mergeHierarchyNames
     * @param finalHierarchyNames {Object} Object hierarchy of names destination
     * @param newHierarchyNames {Object} Object hierarchy of names source
     * @param namesWithDepth {Array} Array of name/depth pairs
     */
    Data.prototype._mergeHierarchyNames = function (finalHierarchyNames, newHierarchyNames, namesWithDepth) {
      var self = this;

      _.each(newHierarchyNames, function (hierarchy) {
        var name = hierarchy.name;
        namesWithDepth.push({name: name, depth: hierarchy.depth});
        var wasMerged = false;
        _.each(finalHierarchyNames, function (finalHierarchy) {
          if (finalHierarchy.name === name) {
            // merge together
            wasMerged = true;
            self._mergeHierarchyNames(finalHierarchy.children, hierarchy.children, namesWithDepth);
          }
        });
        if (!wasMerged) {
          finalHierarchyNames.push(hierarchy);
          self._getNamesWithDepth(hierarchy.children, namesWithDepth);
        }
      });
    };

    /**
     * Helper function for _mergeHierarchyNames to grab just the name/depth pairs when there is
     * no destination merge location.
     *
     * @method _getNamesWithDepth
     * @param hierarchyNames {Object} Object hierarchy of names
     * @param namesWithDepth {Array} Array of name/depth pairs
     */
    Data.prototype._getNamesWithDepth = function (hierarchyNames, namesWithDepth) {
      var self = this;

      _.each(hierarchyNames, function (hierarchy) {
        var name = hierarchy.name;
        namesWithDepth.push({name: name, depth: hierarchy.depth});
        self._getNamesWithDepth(hierarchy.children, namesWithDepth);
      });
    };

    /**
     * Returns an array of names and an object hierarchy of names ordered by size
     *
     * @method pieNames
     * @returns {Object} Object that contains array of names and hierarchy of names
     */
    Data.prototype.pieNames = function () {
      var self = this;
      var mergedHierarchyNames = [];
      var flatNames = [];

      this._validatePieData();

      _.forEach(this.getVisData(), function (obj) {
        var namesWithDepth = [];
        self._mergeHierarchyNames(mergedHierarchyNames, self.getHierarchyNames(obj), namesWithDepth);

        flatNames.push(_(namesWithDepth)
        .sortBy(function (obj) {
            return obj.depth;
          })
        .pluck('name')
        .unique()
        .value());
      });

      return {flatNames: _(flatNames).flatten().unique().value(), nestedNames: mergedHierarchyNames};
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

    /**
     * Get the maximum number of series, considering each chart
     * individually.
     *
     * @return {number} - the largest number of series from all charts
     */
    Data.prototype.maxNumberOfSeries = function () {
      return this.chartData().reduce(function (max, chart) {
        return Math.max(max, chart.series.length);
      }, 0);
    };

    return Data;
  };
});
