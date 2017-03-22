import 'ui/validate_date_interval';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import AggTypesBucketsCreateFilterHistogramProvider from 'ui/agg_types/buckets/create_filter/histogram';
import intervalTemplate from 'ui/agg_types/controls/interval.html';
import minDocCountTemplate from 'ui/agg_types/controls/min_doc_count.html';
import extendedBoundsTemplate from 'ui/agg_types/controls/extended_bounds.html';
export default function HistogramAggDefinition(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const createFilter = Private(AggTypesBucketsCreateFilterHistogramProvider);


  return new BucketAggType({
    name: 'histogram',
    title: 'Histogram',
    ordered: {},
    makeLabel: function (aggConfig) {
      return aggConfig.getFieldDisplayName();
    },
    createFilter: createFilter,
    params: [
      {
        name: 'field',
        filterFieldTypes: 'number'
      },

      {
        name: 'interval',
        editor: intervalTemplate,
        write: function (aggConfig, output) {
          output.params.interval = parseFloat(aggConfig.params.interval);
        }
      },

      {
        name: 'min_doc_count',
        default: null,
        editor: minDocCountTemplate,
        write: function (aggConfig, output) {
          if (aggConfig.params.min_doc_count) {
            output.params.min_doc_count = 0;
          } else {
            output.params.min_doc_count = 1;
          }
        }
      },

      {
        name: 'extended_bounds',
        default: {},
        editor: extendedBoundsTemplate,
        write: function (aggConfig, output) {
          const val = aggConfig.params.extended_bounds;

          if (aggConfig.params.min_doc_count && (val.min != null || val.max != null)) {
            output.params.extended_bounds = {
              min: val.min,
              max: val.max
            };
          }
        },

        // called from the editor
        shouldShow: function (aggConfig) {
          const field = aggConfig.params.field;
          if (
            field
            && (field.type === 'number' || field.type === 'date')
          ) {
            return aggConfig.params.min_doc_count;
          }
        }
      }
    ]
  });
}
