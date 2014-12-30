define(function (require) {
  return function AggTypeMetricPercentilesProvider(Private) {
    var AggType = Private(require('components/agg_types/_agg_type'));

    return new AggType({
      name: 'percentiles',
      title: 'Percentiles',
      makeLabel: function (aggConfig) {
        return 'Percentiles of ' + aggConfig.fieldDisplayName();
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        },
        {
          name: 'percents'
        }
      ]
    });
  };
});