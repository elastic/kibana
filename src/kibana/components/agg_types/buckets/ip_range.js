define(function (require) {
  var _ = require('lodash');
  require('directives/validate_ip');
  require('directives/validate_cidr_mask');

  return function RangeAggDefinition(Private) {
    var BucketAggType = Private(require('components/agg_types/buckets/_bucket_agg_type'));
    var createFilter = Private(require('components/agg_types/buckets/create_filter/ip_range'));

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
          editor: require('text!components/agg_types/controls/ip_ranges.html'),
          write: function (aggConfig, output) {
            var ipRangeType = aggConfig.params.ipRangeType;
            output.params.ranges = aggConfig.params.ranges[ipRangeType];
          }
        }
      ]
    });
  };
});