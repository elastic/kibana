import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import AggTypesBucketsCreateFilterRangeProvider from 'ui/agg_types/buckets/create_filter/range';
import IndexPatternsFieldFormatFieldFormatProvider from 'ui/index_patterns/_field_format/field_format';
import RangeKeyProvider from './range_key';
import rangesTemplate from 'ui/agg_types/controls/ranges.html';
export default function RangeAggDefinition(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const createFilter = Private(AggTypesBucketsCreateFilterRangeProvider);
  const FieldFormat = Private(IndexPatternsFieldFormatFieldFormatProvider);
  const RangeKey = Private(RangeKeyProvider);

  const keyCaches = new WeakMap();
  const formats = new WeakMap();

  return new BucketAggType({
    name: 'range',
    title: 'Range',
    createFilter: createFilter,
    makeLabel: function (aggConfig) {
      return aggConfig.getFieldDisplayName() + ' ranges';
    },
    getKey: function (bucket, key, agg) {
      let keys = keyCaches.get(agg);

      if (!keys) {
        keys = new Map();
        keyCaches.set(agg, keys);
      }

      const id = RangeKey.idBucket(bucket);

      key = keys.get(id);
      if (!key) {
        key = new RangeKey(bucket);
        keys.set(id, key);
      }

      return key;
    },
    getFormat: function (agg) {
      let format = formats.get(agg);
      if (format) return format;

      const RangeFormat = FieldFormat.from(function (range) {
        const format = agg.fieldOwnFormatter();
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
        editor: rangesTemplate,
        write: function (aggConfig, output) {
          output.params.ranges = aggConfig.params.ranges;
          output.params.keyed = true;
        }
      }
    ]
  });
}
