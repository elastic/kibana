define(function (require) {
  let _ = require('lodash');
  require('ui/directives/validate_ip');
  require('ui/directives/validate_cidr_mask');

  return function RangeAggDefinition(Private) {
    let BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    let createFilter = Private(require('ui/agg_types/buckets/create_filter/ip_range'));

    return new BucketAggType({
      name: 'ip_range',
      title: 'IPv4 Range',
      createFilter: createFilter,
      makeLabel: function (aggConfig) {
        return aggConfig.params.field.displayName + ' IP ranges';
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
              {from: '0.0.0.0', to: '127.255.255.255'},
              {from: '128.0.0.0', to: '191.255.255.255'}
            ],
            mask: [
              {mask: '0.0.0.0/1'},
              {mask: '128.0.0.0/2'}
            ]
          },
          editor: require('ui/agg_types/controls/ip_ranges.html'),
          write: function (aggConfig, output) {
            let ipRangeType = aggConfig.params.ipRangeType;
            output.params.ranges = aggConfig.params.ranges[ipRangeType];
          }
        }
      ]
    });
  };
});
