import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';

export default function AggTypeMetricGeoCentroidProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'geo_centroid',
    title: 'Geo Centroid',
    makeLabel: function (aggConfig) {
      return 'Geo Centroid';
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: 'geo_point'
      }
    ]
  });
}

