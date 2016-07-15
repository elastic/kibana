import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import orderAndSizeTemplate from 'ui/agg_types/controls/order_and_size.html';

export default function AggTypeMetricLatestProvider(Private) {
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
        type: 'field',
        filterFieldTypes: ['number', 'boolean', 'date', 'ip',  'string']
      },
      {
        name: 'size',
        default: 5
      },
      {
        name: 'order',
        type: 'optioned',
        default: 'desc',
        editor: orderAndSizeTemplate,
        options: [
          { display: 'Descending', val: 'desc' },
          { display: 'Ascending', val: 'asc' }
        ],
        write: function (agg, output) {
          let field = agg.params.field.name;
          let order = agg.params.order.val;

          let sort = {};
          sort[field] = { order: order };
          output.params.sort = [sort];
          delete output.params.field;
        }
      }
    ]
  });
};
