import { jstz as tzDetect } from 'jstimezonedetect';
import _ from 'lodash';
import moment from 'moment';
import 'ui/filters/field_type';
import 'ui/validate_date_interval';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import TimeBucketsProvider from 'ui/time_buckets';
import AggTypesBucketsCreateFilterDateHistogramProvider from 'ui/agg_types/buckets/create_filter/date_histogram';
import AggTypesBucketsIntervalOptionsProvider from 'ui/agg_types/buckets/_interval_options';
import ConfigDefaultsProvider from 'ui/config/defaults';
import intervalTemplate from 'ui/agg_types/controls/interval.html';
export default function DateHistogramAggType(timefilter, config, Private) {
  let BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  let TimeBuckets = Private(TimeBucketsProvider);
  let createFilter = Private(AggTypesBucketsCreateFilterDateHistogramProvider);
  let intervalOptions = Private(AggTypesBucketsIntervalOptionsProvider);
  let configDefaults = Private(ConfigDefaultsProvider);

  let detectedTimezone = tzDetect.determine().name();
  let tzOffset = moment().format('Z');

  function getInterval(agg) {
    let interval = _.get(agg, ['params', 'interval']);
    if (interval && interval.val === 'custom') interval = _.get(agg, ['params', 'customInterval']);
    return interval;
  }

  function setBounds(agg, force) {
    if (agg.buckets._alreadySet && !force) return;
    agg.buckets._alreadySet = true;
    agg.buckets.setBounds(agg.fieldIsTimeField() && timefilter.getActiveBounds());
  }


  return new BucketAggType({
    name: 'date_histogram',
    title: 'Date Histogram',
    ordered: {
      date: true
    },
    makeLabel: function (agg) {
      let output = this.params.write(agg);
      let params = output.params;
      return params.field + ' per ' + (output.metricScaleText || output.bucketInterval.description);
    },
    createFilter: createFilter,
    decorateAggConfig: function () {
      let buckets;
      return {
        buckets: {
          configurable: true,
          get: function () {
            if (buckets) return buckets;

            buckets = new TimeBuckets();
            buckets.setInterval(getInterval(this));
            setBounds(this);

            return buckets;
          }
        }
      };
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: 'date',
        default: function (agg) {
          return agg.vis.indexPattern.timeFieldName;
        },
        onChange: function (agg) {
          if (_.get(agg, 'params.interval.val') === 'auto' && !agg.fieldIsTimeField()) {
            delete agg.params.interval;
          }

          setBounds(agg, true);
        }
      },

      {
        name: 'interval',
        type: 'optioned',
        deserialize: function (state) {
          let interval = _.find(intervalOptions, {val: state});
          return interval || _.find(intervalOptions, function (option) {
            // For upgrading from 4.0.x to 4.1.x - intervals are now stored as 'y' instead of 'year',
            // but this maps the old values to the new values
            return Number(moment.duration(1, state)) === Number(moment.duration(1, option.val));
          });
        },
        default: 'auto',
        options: intervalOptions,
        editor: intervalTemplate,
        onRequest: function (agg) {
          setBounds(agg, true);
        },
        write: function (agg, output) {
          setBounds(agg);
          agg.buckets.setInterval(getInterval(agg));

          let interval = agg.buckets.getInterval();
          output.bucketInterval = interval;
          output.params.interval = interval.expression;

          let isDefaultTimezone = config.get('dateFormat:tz') === configDefaults['dateFormat:tz'].value;
          output.params.time_zone = isDefaultTimezone ?
            (detectedTimezone || tzOffset) :
            config.get('dateFormat:tz');

          let scaleMetrics = interval.scaled && interval.scale < 1;
          if (scaleMetrics) {
            scaleMetrics = _.every(agg.vis.aggs.bySchemaGroup.metrics, function (agg) {
              return agg.type && (agg.type.name === 'count' || agg.type.name === 'sum');
            });
          }

          if (scaleMetrics) {
            output.metricScale = interval.scale;
            output.metricScaleText = interval.preScaled.description;
          }
        }
      },

      {
        name: 'customInterval',
        default: '2h',
        write: _.noop
      },

      {
        name: 'format'
      },

      {
        name: 'min_doc_count',
        default: 1
      },

      {
        name: 'extended_bounds',
        default: {},
        write: function (agg, output) {
          let val = agg.params.extended_bounds;

          if (val.min != null || val.max != null) {
            output.params.extended_bounds = {
              min: moment(val.min).valueOf(),
              max: moment(val.max).valueOf()
            };

            return;
          }
        }
      }
    ]
  });
};
