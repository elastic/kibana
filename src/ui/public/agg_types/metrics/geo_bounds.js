import { MetricAggType } from 'ui/agg_types/metrics/metric_agg_type';

export const geoBoundsMetricAgg = new MetricAggType({
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
