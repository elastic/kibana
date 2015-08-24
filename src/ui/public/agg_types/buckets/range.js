define(function (require) {
  return function RangeAggDefinition(Private) {
    var _ = require('lodash');
    var BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    var createFilter = Private(require('ui/agg_types/buckets/create_filter/range'));
    var FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));
    var RangeKey = Private(require('./RangeKey'));

    var keyCaches = new WeakMap();
    var formats = new WeakMap();

    return new BucketAggType({
      name: 'range',
      title: 'Range',
      createFilter: createFilter,
      makeLabel: function (aggConfig) {
        return aggConfig.params.field.displayName + ' ranges';
      },
      getKey: function (bucket, key, agg) {
        var keys = keyCaches.get(agg);

        if (!keys) {
          keys = new Map();
          keyCaches.set(agg, keys);
        }

        var id = RangeKey.idBucket(bucket);

        var key = keys.get(id);
        if (!key) {
          key = new RangeKey(bucket);
          keys.set(id, key);
        }

        return key;
      },
      getFormat: function (agg) {
        let format = formats.get(agg);
        if (format) return format;

        let RangeFormat = FieldFormat.from(function (range) {
          let format = agg.fieldOwnFormatter();
          return `${format(range.gte)} to ${format(range.lt)}`;
        });

        format = new RangeFormat();

        formats.set(agg, format);
        return format;
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
          editor: require('ui/agg_types/controls/ranges.html'),
          write: function (aggConfig, output) {
            output.params.ranges = aggConfig.params.ranges;
            output.params.keyed = true;
          }
        }
      ]
    });
  };
});
