define(function (require) {
  var _ = require('lodash');
  var interval = require('utils/interval');

  return function calculateIntervalProvider(Private, timefilter, config) {

    var pickInterval = function (bounds, targetBuckets) {
      bounds || (bounds = timefilter.getBounds());
      return interval.calculate(bounds.min, bounds.max, targetBuckets);
    };

    return function (aggConfig) {
      var result = {};
      var bounds = timefilter.getBounds();
      var selection = aggConfig.params.interval;

      if (!_.isObject(selection)) {
        // custom selection
        selection = {
          display: selection,
          val: selection
        };
      }

      if (selection.val === 'auto') {
        var bucketTarget = config.get('histogram:barTarget');
        result = pickInterval(bounds, bucketTarget);
        result.metricScale = 1;
        return result;
      }

      var ms = selection.ms || interval.toMs(selection.val);
      var buckets = Math.ceil((bounds.max - bounds.min) / ms);
      var maxBuckets = config.get('histogram:maxBars');
      if (buckets > maxBuckets) {
        // we should round these buckets out, and scale back the y values
        result = pickInterval(bounds, maxBuckets);

        // Only scale back the y values if all agg types are count/sum
        var nonCountSumMetric = _.find(aggConfig.vis.aggs.bySchemaGroup.metrics, function (metric) {
          return metric.type.name !== 'count' && metric.type.name !== 'sum';
        });

        if (!nonCountSumMetric) {
          result.metricScale = ms / result.interval;
        }

        result.description = selection.val || result.description;
        return result;
      }

      return {
        interval: selection.ms,
        description: selection.val,
        metricScale: 1
      };
    };
  };
});
