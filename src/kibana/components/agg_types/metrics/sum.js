define(function (require) {
  return function AggTypeMetricSumProvider(Private) {
    var AggType = Private(require('components/agg_types/_agg_type'));

    return new AggType({
      name: 'sum',
      title: 'Sum',
      makeLabel: function (aggConfig) {
        return 'Sum of ' + aggConfig.params.field.displayName;
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