import { BucketAggType } from './_bucket_agg_type';
import { createFilterRange } from './create_filter/range';
import { FieldFormat } from '../../../field_formats/field_format';
import { RangeKey } from './range_key';
import rangesTemplate from '../controls/ranges.html';

const keyCaches = new WeakMap();
const formats = new WeakMap();

export const rangeBucketAgg = new BucketAggType({
  name: 'range',
  title: 'Range',
  createFilter: createFilterRange,
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
