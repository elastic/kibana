define(function (require) {
  let moment = require('moment');
  let dateRange = require('ui/utils/date_range');
  require('ui/directives/validate_date_math');

  return function DateRangeAggDefinition(Private, config) {
    let BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    let createFilter = Private(require('ui/agg_types/buckets/create_filter/date_range'));
    let fieldFormats = Private(require('ui/registry/field_formats'));


    return new BucketAggType({
      name: 'date_range',
      title: 'Date Range',
      createFilter: createFilter,
      getKey: function (bucket, key, agg) {
        let formatter = agg.fieldOwnFormatter('text', fieldFormats.getDefaultInstance('date'));
        return dateRange.toString(bucket, formatter);
      },
      getFormat: function () {
        return fieldFormats.getDefaultInstance('string');
      },
      makeLabel: function (aggConfig) {
        return aggConfig.params.field.displayName + ' date ranges';
      },
      params: [{
        name: 'field',
        filterFieldTypes: 'date',
        default: function (agg) {
          return agg.vis.indexPattern.timeFieldName;
        }
      }, {
        name: 'ranges',
        default: [{
          from: 'now-1w/w',
          to: 'now'
        }],
        editor: require('ui/agg_types/controls/date_ranges.html')
      }]
    });
  };
});
