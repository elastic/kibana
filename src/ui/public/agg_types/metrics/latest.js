import { get } from 'lodash';
import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import latestEditor from 'ui/agg_types/controls/latest.html';

export default function AggTypeMetricAvgProvider(Private) {
  let MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'top_hits',
    title: 'Latest',
    makeLabel: function (aggConfig) {
      return 'Latest ' + aggConfig.params.field.displayName;
    },
    params: [
      {
        name: 'field',
        write(agg, output) {
          output.params = {
            size: 1,
            _source: agg.params.field.name
          };
        }
      },
      {
        name: 'sort',
        type: 'field',
        editor: latestEditor,
        write(agg, output) {
          output.params.sort = [
            {
              [ agg.params.sort.name ]: {
                order: 'desc'
              }
            }
          ];
        }
      }
    ],
    getValue(agg, bucket) {
      return get(bucket[agg.id].hits.hits[0]._source, agg.params.field.name);
    }
  });
};
