define(function (require) {
  return function DateHistogramAggDefinition(timefilter) {
    var _ = require('lodash');
    var moment = require('moment');
    var interval = require('utils/interval');

    // shorthand
    var ms = function (type) { return moment.duration(1, type).asMilliseconds(); };

    var pickInterval = function (bounds) {
      bounds || (bounds = timefilter.getBounds());
      return interval.calculate(bounds.min, bounds.max, 100).interval;
    };

    var agg = this;
    agg.name = 'date_histogram';
    agg.display = 'Date Histogram';
    agg.ordinal = {};
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
          display: 'Quarterly',
          val: 'quarter',
          ms: ms('quarter')
        },
        {
          display: 'Yearly',
          val: 'year',
          ms: ms('year')
        }
      ],
      write: function (selection, output) {
        var bounds = timefilter.getBounds();

        if (selection.val === 'auto') {
          output.aggParams.interval = pickInterval(bounds) + 'ms';
          return;
        }

        var ms = selection.ms || interval.toMs(selection.val);
        var buckets = Math.ceil((bounds.max - bounds.min) / ms);
        if (buckets > 150) {
          // we should round these buckets out, and scale back the y values
          var msPerBucket = pickInterval(bounds);
          output.aggParams.interval = msPerBucket + 'ms';
          output.metricScale = ms / msPerBucket;
        } else {
          output.aggParams.interval = selection.val;
        }
      }
    };

    agg.params.format = {
      custom: true
    };

    agg.params.min_doc_count = {
      custom: true,
      default: 0
    };

    agg.params.extended_bounds = {
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