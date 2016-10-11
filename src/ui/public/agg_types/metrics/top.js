import { noop } from 'lodash';
import MetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import topSortEditor from 'ui/agg_types/controls/top_sort.html';

export default function AggTypeMetricTopProvider(Private) {
  const MetricAggType = Private(MetricAggTypeProvider);

  return new MetricAggType({
    name: 'top_hits',
    title: 'Top',
    makeLabel: function (aggConfig) {
      const prefix = aggConfig.params.sortOrder.val === 'desc' ? 'Last' : 'First';
      return `${prefix} ${aggConfig.params.field.displayName}`;
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: function (vis, value) {
          if (vis.type.name === 'table') {
            return true;
          }
          return value === 'number';
        },
        write(agg, output) {
          output.params = {
            size: 1,
            docvalue_fields: [ agg.params.field.name ]
          };
        }
      },
      {
        name: 'sortField',
        type: 'field',
        editor: null,
        filterFieldTypes: ['number', 'date', 'ip',  'string'],
        default: function (agg) {
          return agg.vis.indexPattern.timeFieldName;
        },
        write: noop // prevent default write, it is handled below
      },
      {
        name: 'sortOrder',
        type: 'optioned',
        default: 'desc',
        editor: topSortEditor,
        options: [
          { display: 'Descending', val: 'desc' },
          { display: 'Ascending', val: 'asc' }
        ],
        write(agg, output) {
          output.params.sort = [
            {
              [ agg.params.sortField.name ]: {
                order: agg.params.sortOrder.val
              }
            }
          ];
        }
      }
    ],
    getValue(agg, bucket) {
      return bucket[agg.id].hits.hits[0].fields[agg.params.field.name][0];
    }
  });
};
