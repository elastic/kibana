define(function (require) {
  let CidrMask = require('ui/utils/CidrMask');
  let buildRangeFilter = require('ui/filter_manager/lib/range');
  return function createIpRangeFilterProvider() {
    return function (aggConfig, key) {
      let range;
      if (aggConfig.params.ipRangeType === 'mask') {
        range = new CidrMask(key).getRange();
      } else {
        let addresses = key.split(/\-/);
        range = {
          from: addresses[0],
          to: addresses[1]
        };
      }

      return buildRangeFilter(aggConfig.params.field, {gte: range.from, lte: range.to}, aggConfig.vis.indexPattern);
    };
  };
});
