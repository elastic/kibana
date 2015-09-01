define(function (require) {
  return function RangeAggDefinition(Private) {
    var _ = require('lodash');
    var BucketAggType = Private(require('components/agg_types/buckets/_bucket_agg_type'));
    var createFilter = Private(require('components/agg_types/buckets/create_filter/range'));
    var fieldFormats = Private(require('registry/field_formats'));

    return new BucketAggType({
      name: 'range',
      title: 'Range',
      createFilter: createFilter,
      makeLabel: function (aggConfig) {
        return aggConfig.params.field.displayName + ' ranges';
      },
      getKey: function (bucket, key, agg) {
        var stringFormat = fieldFormats.getDefaultInstance('string');
        var format = _.get(agg.field(), 'format', stringFormat).getConverterFor('text');
        return format(bucket.from) + ' to ' + format(bucket.to);
      },
      getFormat: function () {
        return fieldFormats.getDefaultInstance('string');
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: ['number']
        },
        {
          name: 'ranges',
          default: [
            { from: 0, to: 1000 },
            { from: 1000, to: 2000 }
          ],
          editor: require('text!components/agg_types/controls/ranges.html'),
          write: function (aggConfig, output) {
            output.params.ranges = aggConfig.params.ranges;
            output.params.keyed = true;
          }
        }
      ]
    });
  };
});
