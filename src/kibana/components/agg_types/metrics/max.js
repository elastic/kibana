define(function (require) {
  return function AggTypeMetricMaxProvider(Private) {
    var AggType = Private(require('components/agg_types/_agg_type'));

    return new AggType({
      name: 'max',
      title: 'Max',
      makeLabel: function (aggConfig) {
        return 'Max ' + aggConfig.params.field.displayName;
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