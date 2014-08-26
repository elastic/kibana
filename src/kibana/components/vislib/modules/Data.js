define(function (require) {
  return function DataFactory(d3, Private) {
    var _ = require('lodash');

    var injectZeros = Private(require('components/vislib/components/_functions/zero_injection/inject_zeros'));
    var orderKeys = Private(require('components/vislib/components/_functions/zero_injection/ordered_x_keys'));
    var getLabels = Private(require('components/vislib/components/_functions/labels/labels'));
    var color = Private(require('components/vislib/components/_functions/color/color'));

    function Data(data) {
      this.data = data;
    }

    Data.prototype.getChartData = function () {
      if (!this.data.series) {
        var arr = this.data.rows ? this.data.rows : this.data.columns;
        return _.pluck(arr);
      }
      return [this.data];
    };

    Data.prototype.get = function (thing) {
      var data = this.getChartData();
      // returns the first thing in the array
      return _.pluck(data, thing)[0];
    };

    Data.prototype.xValues = function () {
      var xValues = orderKeys(this.data);
      var ordered = this.get('ordered');

      // Converts x values to numbers
      if (ordered) {
        this.convertXValueStringsToNumbers(xValues);
      }

      return xValues;
    };

    Data.prototype.convertXValueStringsToNumbers = function (xValues) {
      return xValues.map(function (d) {
        return +d;
      });
    };

    Data.prototype.splitType = function () {
      if (!this.data.series) {
        return this.data.rows ? 'rows' : 'columns';
      }
      return 'series';
    };

//    Data.prototype.splits = function () {
//      if (!this.data.series) {
//        return this.data.rows ? this.data.rows : this.data.columns;
//      }
//      return this.data;
//    };

    Data.prototype.flatten = function () {
      if (!this.data.series) {
        var arr = this.data.rows ? this.data.rows : this.data.columns;
        var series = _.chain(arr).pluck('series').pluck().value();
        var values = [];

        _(series).forEach(function (d) {
          values.push(_.chain(d).flatten().pluck('values').value());
        });

        return values;
      }
      return [_.chain(this.data.series).flatten().pluck('values').value()];
    };

    Data.prototype.stack = function (series) {
      var stack = d3.layout.stack()
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .offset('zero');

      return stack(series);
    };

    Data.prototype.isStacked = function () {
      if (!this.data.series) {

        // for loop to 
        var dataArr = this.data.rows ? this.data.rows : this.data.columns;
        for (var i = 0; i < dataArr.length; i++) {
          if (dataArr[i].series.length > 1) {
            return true;
          }
        }
        return false;
      }

      return this.data.series.length > 1 ? true : false;
    };

    Data.prototype.getYMaxValue = function () {
      var flattenedData = this.flatten();
      var self = this;
      var arr = [];

      _.forEach(flattenedData, function (series) {
        arr.push(self.getYStackMax(series));
      });
      return _.max(arr);
    };

    Data.prototype.getYStackMax = function (series) {
      var self = this;

      if (this.isStacked()) {
        series = this.stack(series);
      }

      return d3.max(series, function (data) {
        return d3.max(data, function (d) {
          if (self.isStacked()) {
            return d.y0 + d.y;
          }
          return d.y;
        });
      });
    };

    Data.prototype.injectZeros = function () {
      return injectZeros(this.data);
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
