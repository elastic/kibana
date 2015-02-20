define(function (require) {
  var _ = require('lodash');

  return function RangeAggDefinition(Private) {
    var _ = require('lodash');
    var moment = require('moment');
    var angular = require('angular');
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
          write: _.noop
        }, {
          name: 'ranges',
          default: [
            { from: '0.0.0.0', to: '127.255.255.255', mask: '10.0.0.0/25' },
            { from: '128.0.0.0', to: '191.255.255.255', mask: '10.0.0.127/25' }
          ],
          editor: require('text!components/agg_types/controls/ip_ranges.html'),
          write: function (aggConfig, output) {
            output.params.ranges = aggConfig.params.ranges.map(function (range) {
              var copy = {};
              if (aggConfig.params.ipRangeType !== 'mask') {
                if (range.to != null) copy.to = range.to;
                if (range.from != null) copy.from = range.from;
              } else {
                copy.mask = range.mask;
              }
              return copy;
            });
          }
        }
      ]
    });
  };
});