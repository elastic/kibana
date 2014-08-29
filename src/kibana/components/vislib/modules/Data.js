define(function (require) {
  return function DataFactory(d3, Private) {
    var _ = require('lodash');

    var injectZeros = Private(require('components/vislib/components/_functions/zero_injection/inject_zeros'));
    var orderKeys = Private(require('components/vislib/components/_functions/zero_injection/ordered_x_keys'));
    var getLabels = Private(require('components/vislib/components/_functions/labels/labels'));
    var color = Private(require('components/vislib/components/_functions/color/color'));

    function Data(data) {
      if (!(this instanceof Data)) {
        return new Data(data);
      }

      this.data = data;
    }

    Data.prototype.chartData = function () {
      if (!this.data.series) {
        var arr = this.data.rows ? this.data.rows : this.data.columns;
        return _.pluck(arr);
      }
      return [this.data];
    };

    Data.prototype.get = function (thing) {
      var data = this.chartData();
      // returns the first thing in the array
      return _.pluck(data, thing)[0];
    };

    Data.prototype.flatten = function () {
      var data = this.chartData();
      var series = _.chain(data).pluck('series').pluck().value();
      var values = [];

      _(series).forEach(function (d) {
        values.push(_.chain(d).flatten().pluck('values').value());
      });

      return values;
    };

    Data.prototype.injectZeros = function () {
      return injectZeros(this.data);
    };

    Data.prototype.xValues = function () {
      return orderKeys(this.data);
    };

    Data.prototype.getLabels = function () {
      return getLabels(this.data);
    };

    Data.prototype.getColorFunc = function () {
      return color(this.getLabels(this.data));
    };

    return Data;
  };
});
