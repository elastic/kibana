define(function (require) {
  return function DateHistogramAggType(timefilter, config, Private) {
    var _ = require('lodash');
    var moment = require('moment');
    var BucketAggType = Private(require('components/agg_types/buckets/_bucket_agg_type'));
    var TimeBuckets = Private(require('components/time_buckets/time_buckets'));
    var createFilter = Private(require('components/agg_types/buckets/create_filter/date_histogram'));
    var intervalOptions = Private(require('components/agg_types/buckets/_interval_options'));

    var tzOffset = moment().format('Z');

    function getInterval(agg) {
      var interval = _.get(agg, ['params', 'interval']);
      if (interval && interval.val === 'custom') interval = _.get(agg, ['params', 'customInterval']);
      return interval;
    }

    function getLabelParts(params, agg) {
      var output = params.write(agg);

      return {
        field: output.params.field,
        isScaled: !!output.bucketInterval.scaled,
        intervalText: output.metricScaleText || output.bucketInterval.description,
        intervalScale: output.metricScaleText,
        intervalDescription: output.bucketInterval.description
      };
    }

    function setBounds(agg, force) {
      if (agg.buckets._alreadySet && !force) return;
      agg.buckets._alreadySet = true;
      agg.buckets.setBounds(agg.fieldIsTimeField() && timefilter.getActiveBounds());
    }

    require('filters/field_type');
    require('components/validateDateInterval');

    return new BucketAggType({
      name: 'date_histogram',
      title: 'Date Histogram',
      ordered: {
        date: true
      },
      makeLabel: function (agg) {
        var label = getLabelParts(this.params, agg);
        var output = label.field + ' per ' + label.intervalDescription;

        if (label.isScaled) {
          if (label.intervalScale) {
            output += ' (scaled to per ' + label.intervalScale + ')';
          }

          return output;
        }

        return this.makeShortLabel(agg);
      },
      makeShortLabel: function (agg) {
        var label = getLabelParts(this.params, agg);
        return label.field + ' per ' + label.intervalText;
      },
      createFilter: createFilter,
      decorateAggConfig: function () {
        var buckets;
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
            var interval = _.find(intervalOptions, {val: state});
            return interval || _.find(intervalOptions, function (option) {
              // For upgrading from 4.0.x to 4.1.x - intervals are now stored as 'y' instead of 'year',
              // but this maps the old values to the new values
              return Number(moment.duration(1, state)) === Number(moment.duration(1, option.val));
            });
          },
          default: 'auto',
          options: intervalOptions,
          editor: require('text!components/agg_types/controls/interval.html'),
          onRequest: function (agg) {
            setBounds(agg, true);
          },
          write: function (agg, output) {
            setBounds(agg);
            agg.buckets.setInterval(getInterval(agg));

            var interval = agg.buckets.getInterval();
            output.bucketInterval = interval;
            output.params.interval = interval.expression;
            output.params.pre_zone = tzOffset;
            output.params.pre_zone_adjust_large_interval = true;

            var scaleMetrics = interval.scaled && interval.scale < 1;
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
            var val = agg.params.extended_bounds;

            if (val.min != null || val.max != null) {
              output.params.extended_bounds = {
                min: moment(val.min).valueOf(),
                max: moment(val.max).valueOf()
              };

              return;
            }

            var bounds = timefilter.getActiveBounds();
            if (bounds) {
              output.params.extended_bounds = {
                min: moment(bounds.min).valueOf(),
                max: moment(bounds.max).valueOf()
              };
            }
          }
        }
      ]
    });
  };
});
