import { AggTypesMetricsMetricAggTypeProvider } from 'ui/agg_types/metrics/metric_agg_type';

export function AggTypesMetricsGeoBoundsProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'geo_bounds',
    title: 'Geo Bounds',
    makeLabel: function () {
      return 'Geo Bounds';
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: 'geo_point'
      }
    ]
  });
}
