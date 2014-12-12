define(function (require) {
  return function FlattenDataObjectUtilService() {
    var _ = require('lodash');

    /*
     * Accepts a Kibana data object, flattens the data.series values array,
     * and returns an array of values objects.
     */

    return function (obj) {
      var charts;
      var isDate;

      if (!_.isObject(obj) || !obj.rows && !obj.columns && !obj.series) {
        throw new TypeError('FlattenDataObjUtilService expects an object with a series, rows, or columns key');
      }

      if (obj.rows) {
        charts = obj.rows;
      } else if (obj.columns) {
        charts = obj.columns;
      } else if (obj.series) {
        charts = [obj];
      }

      isDate = charts.every(function (chart) {
        return chart.ordered && chart.ordered.date;
      });

      return _.chain(charts)
      .pluck('series')
      .flatten()
      .pluck('values')
      .flatten()
      .each(function (chart) {
        chart.isDate = isDate;
      })
      .value();
    };
  };
});
