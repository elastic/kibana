define(function (require) {
  return function createDateRangeFilterProvider() {
    var buildRangeFilter = require('components/filter_manager/lib/range');

    return function (agg, key) {
      var dates = key.split('-');

      return buildRangeFilter(agg.params.field, {
        gte: +new Date(dates[0]),
        lte: +new Date(dates[1])
      }, agg.vis.indexPattern);
    };

  };
});
