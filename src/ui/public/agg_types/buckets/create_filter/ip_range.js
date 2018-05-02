import { CidrMask } from '../../../utils/cidr_mask';
import { buildRangeFilter } from '../../../filter_manager/lib/range';

export function AggTypesBucketsCreateFilterIpRangeProvider() {
  return function (aggConfig, key) {
    let range;
    if (aggConfig.params.ipRangeType === 'mask') {
      range = new CidrMask(key).getRange();
    } else {
      const [from, to] = key.split(/\s+to\s+/);
      range = {
        from: from === '-Infinity' ? -Infinity : from,
        to: to === 'Infinity' ? Infinity : to
      };
    }

    return buildRangeFilter(aggConfig.params.field, { gte: range.from, lte: range.to }, aggConfig.vis.indexPattern);
  };
}
