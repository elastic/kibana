define(function (require) {
  return function OrderedXKeysUtilService(Private) {
    var _ = require('lodash');
    var moment = require('moment');
    var getUniqKeys = Private(require('components/vislib/components/zero_injection/uniq_keys'));

    /*
     * Accepts a Kibana data object and returns
     * an array of x axis values.
     * values sorted by timestamp if isDate and Date Histogram agg
     * else values sorted by index
     */

    return function (obj) {
      if (!_.isObject(obj)) {
        throw new Error('OrderedXKeysUtilService expects an object');
      }

      var objKeys = getUniqKeys(obj);
      var interval = _.deepGet(obj, 'ordered.interval');
      var dateInterval = moment.isDuration(interval) ? interval : false;

      return _(objKeys)
      .pairs()
      .sortBy(function (d) {
        if (d[1].isDate || d[1].isOrdered) {
          return +d[0];
        }
        return d[1].index;
      })
      .map(function (d, i, list) {
        if (!d[1].isNumber) return d[0];

        var val = +d[0];
        if (interval == null) return val;

        var gapEdge = parseFloat(_.deepGet(list, [i + 1, 0]));
        if (isNaN(gapEdge)) return val;

        var vals = [];
        var next = val;

        if (dateInterval) {
          next = moment(val);
          while (next < gapEdge) {
            vals.push(next.valueOf());
            next.add(dateInterval);
          }
        } else {
          while (next < gapEdge) {
            vals.push(next);
            next += interval;
          }
        }

        return vals;
      })
      .flatten(true)
      .value();
    };
  };
});
