define(function (require) {
  var {has} = require('lodash');
  return function mapRangeProvider(Promise, courier) {
    return function (filter) {
      var rangeObj = filter.range;
      if (filter.script) {
        var params = filter.script.params;
        if (params && (params.gte || params.gt || params.lte || params.lt)) rangeObj = {[filter.meta.field]: params};
      }
      if (!rangeObj) return Promise.reject(filter);

      return courier
      .indexPatterns
      .get(filter.meta.index)
      .then(function (indexPattern) {
        var key = Object.keys(rangeObj)[0];
        var convert = indexPattern.fields.byName[key].format.getConverterFor('text');
        var range = rangeObj[key];

        var left = has(range, 'gte') ? range.gte : range.gt;
        if (left == null) left = -Infinity;

        var right = has(range, 'lte') ? range.lte : range.lt;
        if (right == null) right = Infinity;

        return {
          key: key,
          value: `${convert(left)} to ${convert(right)}`
        };
      });

    };
  };
});
