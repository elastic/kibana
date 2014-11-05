define(function (require) {
  return function DateHistogramAggType(timefilter, config, Private) {
    var _ = require('lodash');
    var moment = require('moment');
    var interval = require('utils/interval');
    var AggType = Private(require('components/agg_types/_agg_type'));

    require('filters/field_type');

    var pickInterval = function (bounds, targetBuckets) {
      bounds || (bounds = timefilter.getBounds());
      return interval.calculate(bounds.min, bounds.max, targetBuckets);
    };

    return new AggType({
      name: 'date_histogram',
      title: 'Date Histogram',
      ordered: {
        date: true
      },
      makeLabel: function (aggConfig) {
        var output = this.params.write(aggConfig);
        var params = output.params;

        if (output.metricScaleText) return params.field + ' per ' + output.metricScaleText;

        var aggInterval = _.find(this.params.byName.interval.options, {
          ms: interval.toMs(params.interval)
        });

        if (aggInterval) return aggInterval.display + ' ' + params.field;
        else return params.field + ' per ' + interval.describe(params.interval);
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'date'
        },

        {
          name: 'interval',
          type: 'optioned',
          default: 'auto',
          options: Private(require('components/agg_types/buckets/_interval_options')),
          editor: require('text!components/agg_types/controls/interval.html'),
          write: function (aggConfig, output, locals) {
            var bounds = timefilter.getBounds();
            var auto;

            var selection = aggConfig.params.interval;
            if (!_.isObject(selection)) {
              // custom selection
              selection = {
                display: selection,
                val: selection
              };
            }

            if (selection.val === 'auto') {
              if (locals.renderBot) {
                throw new Error('not implemented');
              }

              var bucketTarget = config.get('histogram:barTarget');
              auto = pickInterval(bounds, bucketTarget);
              output.params.interval = auto.interval + 'ms';
              output.metricScaleText = auto.description;
              return;
            }

            var ms = selection.ms || interval.toMs(selection.val);
            var buckets = Math.ceil((bounds.max - bounds.min) / ms);
            var maxBuckets = config.get('histogram:maxBars');
            if (buckets > maxBuckets) {
              // we should round these buckets out, and scale back the y values
              auto = pickInterval(bounds, maxBuckets);
              output.params.interval = auto.interval + 'ms';

              // Only scale back the y values if all agg types are count/sum
              var nonCountSumMetric = _.find(aggConfig.vis.aggs.bySchemaGroup.metrics, function (metric) {
                return metric.type.name !== 'count' && metric.type.name !== 'sum';
              });

              if (!nonCountSumMetric) {
                output.metricScale = ms / auto.interval;
              }

              output.metricScaleText = selection.val || auto.description;
            } else {
              output.params.interval = selection.val;
            }
          }
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
          write: function (aggConfig, output) {
            var val = aggConfig.params.extended_bounds;

            if (val.min != null || val.max != null) {
              output.params.extended_bounds = {
                min: val.min,
                max: val.max
              };
            } else if (aggConfig.vis.indexPattern.timeFieldName) {
              var tfBounds = timefilter.getBounds();
              output.params.extended_bounds = {
                min: tfBounds.min,
                max: tfBounds.max
              };
            }
          }
        }
      ]
    });
  };
});