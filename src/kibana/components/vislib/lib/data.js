define(function (require) {
  return function DataFactory(d3, Private) {
    var _ = require('lodash');

    var injectZeros = Private(require('components/vislib/components/_functions/zero_injection/inject_zeros'));
    var orderKeys = Private(require('components/vislib/components/_functions/zero_injection/ordered_x_keys'));
    var getLabels = Private(require('components/vislib/components/_functions/labels/labels'));
    var color = Private(require('components/vislib/components/_functions/color/color'));

    /*
     * Provides an API for pulling values off the data
     * arguments:
     *  data => Provided data object
     */
    function Data(data) {
      if (!(this instanceof Data)) {
        return new Data(data);
      }

      this.data = data;
    }

    // Return the actual x and y data values
    Data.prototype.chartData = function () {
      if (!this.data.series) {
        var arr = this.data.rows ? this.data.rows : this.data.columns;
        return _.pluck(arr);
      }
      return [this.data];
    };

    // Get attributes off the data, e.g. `tooltipFormatter` or `xAxisFormatter`
    Data.prototype.get = function (thing) {
      var data = this.chartData();
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
      return color(this.getLabels(this.data));
    };

    return Data;
  };
});
