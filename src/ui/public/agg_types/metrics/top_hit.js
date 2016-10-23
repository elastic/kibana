import { get, has, noop } from 'lodash';
import MetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import topSortEditor from 'ui/agg_types/controls/top_sort.html';

export default function AggTypeMetricTopProvider(Private) {
  const MetricAggType = Private(MetricAggTypeProvider);

  return new MetricAggType({
    name: 'top_hits',
    title: 'Top Hit',
    makeLabel: function (aggConfig) {
      const prefix = aggConfig.params.sortOrder.val === 'desc' ? 'Last' : 'First';
      return `${prefix} ${aggConfig.params.field.displayName}`;
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: function (vis, value) {
          if (vis.type.name === 'table' || vis.type.name === 'metric') {
            return true;
          }
          return value === 'number';
        },
        write(agg, output) {
          const field = agg.params.field;
          output.params = { size: 1 };

          if (field.scripted) {
            output.params.script_fields = {
              [ field.name ]: {
                script: {
                  inline: field.script,
                  lang: field.lang
                }
              }
            };
          } else {
            output.params.docvalue_fields = [ field.name ];
          }
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
      const hits = get(bucket, `${agg.id}.hits.hits`);
      if (!hits || !hits.length || !has(hits[0], 'fields')) {
        return;
      }
      return hits[0].fields[agg.params.field.name] && hits[0].fields[agg.params.field.name][0];
    }
  });
};
