define(function (require) {
  return function AggTypeMetricCardinalityProvider(Private) {
    var MetricAggType = Private(require('ui/agg_types/metrics/MetricAggType'));
    var fieldFormats = Private(require('ui/registry/field_formats'));

    return new MetricAggType({
      name: 'cardinality',
      title: 'Unique Count',
      makeLabel: function (aggConfig) {
        return 'Unique count of ' + aggConfig.params.field.displayName;
      },
      getFormat: function () {
        return fieldFormats.getDefaultInstance('number');
      },
      params: [
        {
          name: 'field'
        }
      ]
    });
  };
});
