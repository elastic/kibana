define(function (require) {
  return function DataFactory(d3, Private) {
    var _ = require('lodash');

    var injectZeros = Private(require('components/vislib/components/zero_injection/inject_zeros'));
    var orderKeys = Private(require('components/vislib/components/zero_injection/ordered_x_keys'));
    var getLabels = Private(require('components/vislib/components/labels/labels'));
    var color = Private(require('components/vislib/components/color/color'));

    /*
     * Provides an API for pulling values off the data
     * arguments:
     *  data => Provided data object
     */
    function Data(data, attr) {
      if (!(this instanceof Data)) {
        return new Data(data, attr);
      }

      this.data = data;
      this._attr = attr;
      // d3 stack function
      this._attr = _.defaults(attr || {}, {
        offset: 'zero',
        stack: d3.layout.stack()
          .x(function (d) { return d.x; })
          .y(function (d) { return d.y; })
          .offset(this._attr.offset)
      });
    }

    // Return the actual x and y data values
    Data.prototype.chartData = function () {
      if (!this.data.series) {
        var arr = this.data.rows ? this.data.rows : this.data.columns;
        return _.pluck(arr);
      }
      return [this.data];
    };

    // Function to determine whether to display the legend or not
    // Displays legend when more than one series of data present
    Data.prototype.isLegendShown = function () {
      var isLegend = false;
      var visData;

      if (this.data.rows) {
        visData = this.data.rows;
      } else if (this.data.columns) {
        visData = this.data.columns;
      } else {
        visData = [this.data];
      }

      _.forEach(visData, function countSeriesLength(obj) {
        var dataLength = obj.series ? obj.series.length : obj.slices.children.length;

        if (dataLength > 1) {
          isLegend = true;
        }
      });

      return isLegend;
    };

    Data.prototype.pieData = function () {
      if (!this.data.slices) {
        return this.data.rows ? this.data.rows : this.data.columns;
      }
      return [this.data];
    };

    // Get attributes off the data, e.g. `tooltipFormatter` or `xAxisFormatter`
    Data.prototype.get = function (thing) {
      var data;

      if (this.data.rows) {
        data = this.data.rows;
      } else if (this.data.columns) {
        data = this.data.columns;
      } else {
        data = [this.data];
      }

      // pulls the value off the first item in the array
      // these values are typically the same between data objects of the same chart
      // May need to verify this or refactor
      return _.pluck(data, thing)[0];
    };

    // Return an array of all value objects
    Data.prototype.flatten = function () {
      var data = this.chartData();
      // Pluck the data.series array from each data object
      var series = _.chain(data).pluck('series').pluck().value();
      var values = [];

      // Create an array of all the value objects from the series array
      _(series).forEach(function (d) {
        values.push(_.chain(d).flatten().pluck('values').value());
      });

      return values;
    };

    Data.prototype.shouldBeStacked = function (series) {
      // Series should be an array
      if (series.length > 1) {
        return true;
      }
      return false;
    };

    // Calculate the max y value from this.dataArray
    Data.prototype.getYMaxValue = function () {
      var self = this;
      var arr = [];

      // for each object in the dataArray,
      // push the calculated y value to the initialized array (arr)
      _.forEach(this.flatten(), function (series) {
        arr.push(self.getYStackMax(series));
      });

      // return the largest value from the array
      return _.max(arr);
    };

    Data.prototype.stackData = function (series) {
      // Determine if the data should be stacked
      if (this.shouldBeStacked(series)) {
        // if true, stack data
        return this._attr.stack(series);
      }
      return series;
    };

    Data.prototype.getYStackMax = function (series) {
      // Return the calculated y value
      return d3.max(this.stackData(series), function (data) {
        return d3.max(data, function (d) {
          // if stacked, need to add d.y0 + d.y for the y value
          if (d.y0) {
            return d.y0 + d.y;
          }
          return d.y;
        });
      });
    };

    // Inject zeros into the data
    Data.prototype.injectZeros = function () {
      return injectZeros(this.data);
    };

    // Return an array of all x item values from the data
    Data.prototype.xValues = function () {
      return orderKeys(this.data);
    };

    // Return an array of unique labels
    Data.prototype.getLabels = function () {
      return getLabels(this.data);
    };

    // Return a function that does color lookup on labels
    Data.prototype.getColorFunc = function () {
      return color(this.getLabels());
    };

    // Return a function that does color lookup on names for pie charts
    Data.prototype.getPieColorFunc = function () {
      return color(this.data.names);
    };

    return Data;
  };
});
