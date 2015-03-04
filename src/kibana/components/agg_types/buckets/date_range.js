define(function (require) {
  var _ = require('lodash');

  return function DateRangeAggDefinition(Private) {
    var BucketAggType = Private(require('components/agg_types/buckets/_bucket_agg_type'));
    var createFilter = Private(require('components/agg_types/buckets/create_filter/date_range'));

    return new BucketAggType({
      name: 'date_range',
      title: 'Date Range',
      createFilter: createFilter,
      makeLabel: function (aggConfig) {
        return aggConfig.params.field.displayName + ' date ranges';
      },
      params: [{
        name: 'field',
        filterFieldTypes: 'date'
      }, {
        name: 'format',
        default: 'd MMM yyyy'
      }, {
        name: 'ranges',
        default: [{
          from: new Date(new Date().getFullYear() - 1, 0, 1),
          to: new Date(new Date().getFullYear(), 0, 1)
        }],
        editor: require('text!components/agg_types/controls/date_ranges.html'),
        write: function (aggConfig, output) {
          output.params.ranges = aggConfig.params.ranges.map(function (range) {
            return {
              from: +new Date(range.from),
              to: +new Date(range.to)
            };
          });
        }
      }]
    });
  };
});