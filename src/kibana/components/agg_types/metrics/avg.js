define(function (require) {
  return function AggTypeMetricAvgProvider(Private) {
    var AggType = Private(require('components/agg_types/_agg_type'));

    return new AggType({
      name: 'avg',
      title: 'Average',
      makeLabel: function (aggConfig) {
        return 'Average ' + aggConfig.params.field.displayName;
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        }
      ]
    });
  };
});