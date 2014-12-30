define(function (require) {
  return function AggTypeMetricCardinalityProvider(Private) {
    var AggType = Private(require('components/agg_types/_agg_type'));

    return new AggType({
      name: 'cardinality',
      title: 'Unique count',
      makeLabel: function (aggConfig) {
        return 'Unique count of ' + aggConfig.params.field.displayName;
      },
      params: [
        {
          name: 'field'
        }
      ]
    });
  };
});