define(function (require) {
  return function RangeAggDefinition(Private) {
    var _ = require('lodash');
    var BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    var createFilter = Private(require('ui/agg_types/buckets/create_filter/range'));
    var FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));

    var keyCaches = new WeakMap();

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

        var id = `from:${bucket.from},to:${bucket.to}`;
        var key = keys.get(id);
        if (!key) {
          keys.set(id, key = {
            gte: bucket.from == null ? -Infinity : bucket.from,
            lt: bucket.to == null ? +Infinity : bucket.to,
            toString: () => id
          });
        }

        return key;
      },
      getFormat: function (agg) {
        if (agg.$$rangeAggTypeFormat) return agg.$$rangeAggTypeFormat;

        var RangeFormat = FieldFormat.from(function (range) {
          var format = agg.fieldOwnFormatter();
          return `${format(range.gte)} to ${format(range.lt)}`;
        });

        return (this.$$rangeAggTypeFormat = new RangeFormat());
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
