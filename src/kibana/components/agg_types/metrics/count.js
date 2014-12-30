define(function (require) {
  return function AggTypeMetricCountProvider(Private) {
    var AggType = Private(require('components/agg_types/_agg_type'));

    return new AggType({
      name: 'count',
      title: 'Count',
      hasNoDsl: true,
      makeLabel: function (aggConfig) {
        return 'Count of documents';
      }
    });
  };
});