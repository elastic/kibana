define(function (require) {
  return function UniqueXValuesUtilService(Private) {
    var _ = require('lodash');

    var flattenDataArray = Private(require('components/vislib/components/zero_injection/flatten_data'));

    /*
     * Accepts a Kibana data object.
     * Returns an object with unique x axis values as keys with an object of
     * their index numbers and an isNumber boolean as their values.
     * e.g. { 'xAxisValue': { index: 1, isNumber: false }}, ...
     */

    return function (obj) {
      if (!_.isObject(obj)) {
        throw new TypeError('UniqueXValuesUtilService expects an object');
      }

      var flattenedData = flattenDataArray(obj);
      var uniqueXValues = {};

      var charts;
      if (!obj.series) {
        charts = obj.rows ? obj.rows : obj.columns;
      } else {
        charts = [obj];
      }

      var isDate = charts.every(function (chart) {
        return chart.ordered && chart.ordered.date;
      });

      var isOrdered = charts.every(function (chart) {
        return chart.ordered;
      });

      flattenedData.forEach(function (d, i) {
        var key = (_.isPlainObject(d.x)) ? d.x.toString() : d.x;
        var prev = uniqueXValues[key];

        if (d.xi != null) {
          i = d.xi;
        }

        if (prev) {
          i = Math.min(i, prev.index);
        }

        uniqueXValues[key] = [d.x, {
          index: i,
          isDate: isDate,
          isOrdered: isOrdered,
          isNumber: _.isNumber(key)
        }];
      });

      return _.values(uniqueXValues);
    };
  };
});
