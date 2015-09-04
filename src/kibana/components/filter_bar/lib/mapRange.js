define(function (require) {
  var _ = require('lodash');
  return function mapRangeProvider(Promise, courier) {
    return function (filter) {
      if (!filter.range) return Promise.reject(filter);

      return courier.indexPatterns.get(filter.meta.index)
      .then(function (indexPattern) {
        var key = Object.keys(filter.range)[0];
        var convert = indexPattern.fields.byName[key].format.getConverterFor('text');
        var range = filter.range[key];

        var left = _.has(range, 'gte') ? range.gte : range.gt;
        if (left == null) left = -Infinity;

        var right = _.has(range, 'lte') ? range.lte : range.lt;
        if (right == null) right = Infinity;

        return {
          key: key,
          value: convert(left) + ' to ' + convert(right)
        };
      });
    };
  };
});
