import _ from 'lodash';
import moment from 'moment';
import 'ui/validate_date_interval';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import AggTypesBucketsCreateFilterHistogramProvider from 'ui/agg_types/buckets/create_filter/histogram';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import intervalTemplate from 'ui/agg_types/controls/interval.html';
import minDocCountTemplate from 'ui/agg_types/controls/min_doc_count.html';
import extendedBoundsTemplate from 'ui/agg_types/controls/extended_bounds.html';
import autoScaleTemplate from 'ui/agg_types/controls/auto_scale.html';
export default function HistogramAggDefinition(Private) {
  let BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  let createFilter = Private(AggTypesBucketsCreateFilterHistogramProvider);
  let queryFilter = Private(FilterBarQueryFilterProvider);
  const NUM_BUCKETS = 50;

  function numberOfDigits(num) {
    return (Math.trunc(num).toString()).length;
  }

  function getInterval(agg) {
    var interval = parseInt(agg.params.interval, 10);
    if (agg.params.auto_scale) {
      var found = false;
      var min = 0;
      var max = 0;
      var key = agg.params.field.displayName;
      _.flatten([queryFilter.getAppFilters(), queryFilter.getGlobalFilters()]).forEach(function (it) {
        if (it.meta.key === key) {
          var filterMin = -1;
          var filterMax = -1;
          if ('gte' in it.range[key]) filterMin = it.range[key].gte;
          if ('gt' in it.range[key]) filterMin = it.range[key].gt;
          if ('lte' in it.range[key]) filterMax = it.range[key].lte;
          if ('lt' in it.range[key]) filterMax = it.range[key].lt;
          if (filterMin !== -1 && filterMax !== -1) {
            if (!found || filterMin < min) min = filterMin;
            if (!found || filterMax > max) max = filterMax;
            found = true;
          }
        }
      });
      if (found) {
        var range = max - min;
        interval = range / NUM_BUCKETS;
        var digits = numberOfDigits(interval);
        var roundPrecision = 0;
        if (digits === 2) {
          roundPrecision = -1;
        } else if (digits > 2) {
          roundPrecision = (digits - 2) * -1;
        }
        interval = _.round(interval, roundPrecision);
        if (interval < 1) interval = 1;
      }
    }
    return interval;
  }

  return new BucketAggType({
    name: 'histogram',
    title: 'Histogram',
    ordered: {},
    makeLabel: function (aggConfig) {
      return aggConfig.params.field.displayName;
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
          output.params.interval = getInterval(aggConfig);
        }
      },

      {
        name: 'auto_scale',
        default: null,
        editor: autoScaleTemplate,
        write: function (aggConfig, output) {
          return null;
        }
      },

      {
        name: 'min_doc_count',
        default: null,
        editor: minDocCountTemplate,
        write: function (aggConfig, output) {
          if (aggConfig.params.min_doc_count) {
            output.params.min_doc_count = 0;
          }
        }
      },

      {
        name: 'extended_bounds',
        default: {},
        editor: extendedBoundsTemplate,
        write: function (aggConfig, output) {
          let val = aggConfig.params.extended_bounds;

          if (aggConfig.params.min_doc_count && (val.min != null || val.max != null)) {
            output.params.extended_bounds = {
              min: val.min,
              max: val.max
            };
          }
        },

        // called from the editor
        shouldShow: function (aggConfig) {
          let field = aggConfig.params.field;
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
};
