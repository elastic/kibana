define(function (require) {
  return function DateHistogramAggDefinition(timefilter, config) {
    var _ = require('lodash');
    var moment = require('moment');
    var interval = require('utils/interval');

    // shorthand
    var ms = function (type) { return moment.duration(1, type).asMilliseconds(); };

    var pickInterval = function (bounds, targetBuckets) {
      bounds || (bounds = timefilter.getBounds());
      return interval.calculate(bounds.min, bounds.max, targetBuckets);
    };

    var agg = this;
    agg.name = 'date_histogram';
    agg.display = 'Date Histogram';
    agg.ordered = {date: true};

    agg.makeLabel = function (params, fullConfig) {
      if (fullConfig.metricScaleText) return params.field + ' per ' + fullConfig.metricScaleText;

      var aggInterval = _.find(agg.params.interval.options, { ms: interval.toMs(params.interval) });
      if (aggInterval) return aggInterval.display + ' ' + params.field;
      else return params.field + ' per ' + interval.describe(params.interval);
    };

    agg.params = {};
    agg.params.interval = {
      required: true,
      default: 'auto',
      custom: true,
      options: [
        {
          display: 'Auto',
          val: 'auto'
        },
        {
          display: 'Second',
          val: 'second',
          ms: ms('second')
        },
        {
          display: 'Minute',
          val: 'minute',
          ms: ms('minute')
        },
        {
          display: 'Hourly',
          val: 'hour',
          ms: ms('hour')
        },
        {
          display: 'Daily',
          val: 'day',
          ms: ms('day')
        },
        {
          display: 'Weekly',
          val: 'week',
          ms: ms('week')
        },
        {
          display: 'Monthly',
          val: 'month',
          ms: ms('month')
        },
        {
          display: 'Yearly',
          val: 'year',
          ms: ms('year')
        }
      ],

      write: function (selection, output) {
        var bounds = timefilter.getBounds();
        var auto;

        if (selection.val === 'auto') {
          var bucketTarget = config.get('histogram:barTarget');
          auto = pickInterval(bounds, bucketTarget);
          output.aggParams.interval = auto.interval + 'ms';
          output.metricScaleText = auto.description;
          return;
        }

        var ms = selection.ms || interval.toMs(selection.val);
        var buckets = Math.ceil((bounds.max - bounds.min) / ms);
        var maxBuckets = config.get('histogram:maxBars');
        if (buckets > maxBuckets) {
          // we should round these buckets out, and scale back the y values
          auto = pickInterval(bounds, maxBuckets);
          output.aggParams.interval = auto.interval + 'ms';
          output.metricScale = ms / auto.interval;
          output.metricScaleText = selection.val || auto.description;
        } else {
          output.aggParams.interval = selection.val;
        }
      }
    };

    agg.params.format = {
      hide: true,
      custom: true
    };

    agg.params.extended_bounds = {
      hide: true,
      default: {},
      write: function (selection, output) {
        var bounds = timefilter.getBounds();
        output.aggParams.extended_bounds = {
          min: bounds.min,
          max: bounds.max
        };
      }
    };
  };
});