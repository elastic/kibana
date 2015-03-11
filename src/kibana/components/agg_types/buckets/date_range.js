define(function (require) {
  var _ = require('lodash');
  require('directives/validate_date_math');

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
          from: 'now-1w/w',
          to: 'now'
        }],
        editor: require('text!components/agg_types/controls/date_ranges.html')
      }]
    });
  };
});