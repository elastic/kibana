import { noop, get } from 'lodash';
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
        editor: null,
        filterFieldTypes: ['number', 'date', 'ip',  'string'],
        default: function (agg) {
          return agg.vis.indexPattern.timeFieldName;
        },
        write: noop // prevent default write, it is handled below
      },
      {
        name: 'order',
        type: 'optioned',
        default: 'desc',
        editor: latestEditor,
        options: [
          { display: 'Descending', val: 'desc' },
          { display: 'Ascending', val: 'asc' }
        ],
        write(agg, output) {
          output.params.sort = [
            {
              [ agg.params.sort.name ]: {
                order: agg.params.order.val
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
