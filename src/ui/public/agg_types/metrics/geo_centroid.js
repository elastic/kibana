import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';

export default function AggTypeMetricGeoCentroidProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'geo_centroid',
    title: 'Geo Centroid',
    makeLabel: function () {
      return 'Geo Centroid';
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: 'geo_point'
      }
    ],
    getValue: function (agg, bucket) {
      return bucket[agg.id] && bucket[agg.id].location;
    }
  });
}
