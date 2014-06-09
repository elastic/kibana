define(function (require) {
  return function DateHistogramAggDefinition(timefilter, config) {
    var _ = require('lodash');
    var moment = require('moment');
    var interval = require('utils/interval');

    // shorthand
    var ms = function (type) { return moment.duration(1, type).asMilliseconds(); };

    var pickInterval = function (bounds) {
      bounds || (bounds = timefilter.getBounds());
      return interval.calculate(bounds.min, bounds.max, config.get('histogram:barTarget'));
    };

    var agg = this;
    agg.name = 'date_histogram';
    agg.display = 'Histogram';
    agg.ordered = {date: true};

    agg.makeLabel = function (params) {
      var interval = _.find(agg.params.interval.options, { val: params.interval });
      if (interval) return interval.display + ' ' + params.field;
      else return params.field + '/' + moment.duration(params.interval).humanize();
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
          auto = pickInterval(bounds);
          output.aggParams.interval = auto.interval + 'ms';
          output.metricScaleText = auto.description;
          return;
        }

        var ms = selection.ms || interval.toMs(selection.val);
        var buckets = Math.ceil((bounds.max - bounds.min) / ms);
        if (buckets > config.get('histogram:maxBars')) {
          // we should round these buckets out, and scale back the y values
          auto = pickInterval(bounds);
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

    agg.params.min_doc_count = {
      hide: true,
      custom: true,
      default: 0,
      write: function (selection, output) {
        output.aggParams.min_doc_count = 0;
      }
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