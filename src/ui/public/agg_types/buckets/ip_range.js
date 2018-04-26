import _ from 'lodash';
import '../../directives/validate_ip';
import '../../directives/validate_cidr_mask';
import { BucketAggType } from './_bucket_agg_type';
import { createFilterIpRange } from './create_filter/ip_range';
import ipRangesTemplate from '../controls/ip_ranges.html';

export const ipRangeBucketAgg = new BucketAggType({
  name: 'ip_range',
  title: 'IPv4 Range',
  createFilter: createFilterIpRange,
  getKey: function (bucket, key) {
    if (key) return key;
    const from = _.get(bucket, 'from', '-Infinity');
    const to = _.get(bucket, 'to', 'Infinity');
    return `${from} to ${to}`;
  },
  makeLabel: function (aggConfig) {
    return aggConfig.getFieldDisplayName() + ' IP ranges';
  },
  params: [
    {
      name: 'field',
      filterFieldTypes: 'ip'
    }, {
      name: 'ipRangeType',
      default: 'fromTo',
      write: _.noop
    }, {
      name: 'ranges',
      default: {
        fromTo: [
          { from: '0.0.0.0', to: '127.255.255.255' },
          { from: '128.0.0.0', to: '191.255.255.255' }
        ],
        mask: [
          { mask: '0.0.0.0/1' },
          { mask: '128.0.0.0/2' }
        ]
      },
      editor: ipRangesTemplate,
      write: function (aggConfig, output) {
        const ipRangeType = aggConfig.params.ipRangeType;
        let ranges = aggConfig.params.ranges[ipRangeType];

        if (ipRangeType === 'fromTo') {
          ranges = _.map(ranges, (range) => {
            return _.omit(range, _.isNull);
          });
        }

        output.params.ranges = ranges;
      }
    }
  ]
});
