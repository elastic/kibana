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
          required: true,
          filterFieldTypes: 'date'
        },

        {
          name: 'interval',
          required: true,
          custom: true,
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
              output.metricScale = ms / auto.interval;
              output.metricScaleText = selection.val || auto.description;
            } else {
              output.params.interval = selection.val;
            }
          }
        },

        {
          name: 'format',
          custom: true
        },

        {
          name: 'extended_bounds',
          default: {},
          write: function (selection, output) {
            var bounds = timefilter.getBounds();
            output.params.extended_bounds = {
              min: bounds.min,
              max: bounds.max
            };
          }
        }
      ]
    });
  };
});