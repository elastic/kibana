define(function (require) {
  return function AggTypeMetricMinProvider(Private) {
    var AggType = Private(require('components/agg_types/_agg_type'));

    return new AggType({
      name: 'min',
      title: 'Min',
      makeLabel: function (aggConfig) {
        return 'Min ' + aggConfig.params.field.displayName;
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