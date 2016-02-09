import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/MetricAggType';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';

export default function AggTypeMetricCardinalityProvider(Private) {
  var MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  var fieldFormats = Private(RegistryFieldFormatsProvider);

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
