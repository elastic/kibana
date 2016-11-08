import _ from 'lodash';
import 'ui/directives/validate_ip';
import 'ui/directives/validate_cidr_mask';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import AggTypesBucketsCreateFilterIpRangeProvider from 'ui/agg_types/buckets/create_filter/ip_range';
import ipRangesTemplate from 'ui/agg_types/controls/ip_ranges.html';

export default function RangeAggDefinition(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const createFilter = Private(AggTypesBucketsCreateFilterIpRangeProvider);

  return new BucketAggType({
    name: 'ip_range',
    title: 'IPv4 Range',
    createFilter: createFilter,
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
}
