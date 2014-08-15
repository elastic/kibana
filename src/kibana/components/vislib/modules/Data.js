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

    Data.prototype.splitType = function () {
      if (!this.data.series) {
        return this.data.rows ? 'rows' : 'columns';
      }
      return 'series';
    };

    Data.prototype.splits = function () {
      if (!this.data.series) {
        return this.data.rows ? this.data.rows : this.data.columns;
      }
      return this.data.series;
    };

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
        var arr = this.data.rows ? this.data.rows[0] : this.data.columns[0];
        var length = arr.series.length;

        return length > 1 ? true : false;
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

    Data.prototype.isOrdered = function () {
      this.ordered = this.data.rows ? this.data.rows[0].ordered :
        this.data.columns ? this.data.columns[0].ordered : this.data.ordered;

      if (this.ordered) {
        return true;
      }
      return false;
    };

    Data.prototype.xValues = function () {
      this.orderedKeys = orderKeys(this.data);
      if (this.isOrdered) {
        this.orderedKeys = this.orderedKeys.map(function (d) {
          return +d;
        });
      }
      return this.orderedKeys;
    };

    Data.prototype.injectZeros = function () {
      this.zeroInjectedData = injectZeros(this.data);
      return this.zeroInjectedData;
    };

    Data.prototype.getColorFunc = function () {
      if (!this.labels) {
        this.labels = this.getLabels(this.data);
      }
      this.color = color(this.labels);
      return this.color;
    };

    Data.prototype.getLabels = function () {
      this.labels = getLabels(this.data);
      return this.labels;
    };

    Data.prototype.get = function (name) {
      return this.data.rows ? this.data.rows[0][name] :
        this.data.columns ? this.data.columns[0][name] : this.data[name];
    };

    return Data;
  };
});
