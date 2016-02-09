import CidrMask from 'ui/utils/CidrMask';
import buildRangeFilter from 'ui/filter_manager/lib/range';
export default function createIpRangeFilterProvider() {
  return function (aggConfig, key) {
    var range;
    if (aggConfig.params.ipRangeType === 'mask') {
      range = new CidrMask(key).getRange();
    } else {
      var addresses = key.split(/\-/);
      range = {
        from: addresses[0],
        to: addresses[1]
      };
    }

    return buildRangeFilter(aggConfig.params.field, {gte: range.from, lte: range.to}, aggConfig.vis.indexPattern);
  };
};
