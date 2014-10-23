define(function (require) {
  return function DateHistogramAggType(timefilter, config, Private) {
    var _ = require('lodash');
    var moment = require('moment');
    var interval = require('utils/interval');
    var AggType = Private(require('components/agg_types/_agg_type'));
    var calculateInterval = Private(require('components/agg_types/param_types/_calculate_interval'));

    var createFilter = Private(require('components/agg_types/buckets/create_filter/date_histogram'));

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
      createFilter: createFilter,
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
            // Get the selection
            var selection = aggConfig.params.interval;

            // If the selection isn't an object then it's going to be
            // a string so we need to make it look like an object.
            if (!_.isObject(selection)) {
              // custom selection
              selection = {
                display: selection,
                val: selection
              };
            }

            // If the selection is set to auto and the locals.renderBot
            // exists we need to blow up (for some unknown reason)
            if (selection.val === 'auto' && locals.renderBot) {
              throw new Error('not implemented');
            }

            // Calculate the actual interval
            var result = calculateInterval(aggConfig);

            // Set the output params interval along with the metric scale and
            // the metric scale test which is used in the label
            output.params.interval = result.interval + 'ms';
            if (result.metricScale) output.metricScale = result.metricScale;
            output.metricScaleText = result.description;

            // Since this is side effecting on output
            // we will return right here.
            // TODO: refactor so it's not side effecting so we can write tests
            // around it.
            return;
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
                min: moment(val.min).valueOf(),
                max: moment(val.max).valueOf()
              };
            } else if (aggConfig.vis.indexPattern.timeFieldName) {
              var tfBounds = timefilter.getBounds();
              output.params.extended_bounds = {
                min: moment(tfBounds.min).valueOf(),
                max: moment(tfBounds.max).valueOf()
              };
            }
          }
        }
      ]
    });
  };
});
