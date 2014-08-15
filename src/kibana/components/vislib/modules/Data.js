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

    Data.prototype.flatten = function () {
      if (!this.data.series) {
        var arr = this.data.rows ? this.data.rows : this.data.columns;

        this.flattenedData = _.chain(arr)
          .pluck()
          .pluck('series')
          .flatten()
          .pluck('values')
          .value();

        return this.flattenedData;
      }

      this.flattenedData = _.chain(this.data.series)
        .flatten()
        .pluck('values')
        .value();

      console.log(this.flattenedData);

      return this.flattenedData;
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

    Data.prototype.stack = function (offset) {
      if (!this.flattenedData) {
        this.flattenedData = this.flatten();
      }

      var stack = d3.layout.stack()
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .offset(offset);

      this.stackedData = stack(this.flattenedData);
      return this.stackedData;
    };

    Data.prototype.getYStackMax = function () {
      console.log(this.stack());
      this.yStackMax = d3.max(this.stack(), function (data) {
        return d3.max(data, function (d) {
          return d.y0 + d.y;
        });
      });
      return this.yStackMax;
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
      this[name] = this.data.rows ? this.data.rows[0][name] :
        this.data.columns ? this.data.columns[0][name] : this.data[name];
      return this[name];
    };

    return Data;
  };
});
