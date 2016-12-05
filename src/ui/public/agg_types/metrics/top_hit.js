import _ from 'lodash';
import MetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import topSortEditor from 'ui/agg_types/controls/top_sort.html';

export default function AggTypeMetricTopProvider(Private) {
  const MetricAggType = Private(MetricAggTypeProvider);
  const fieldFormats = Private(RegistryFieldFormatsProvider);

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
        onlyAggregatable: false,
        showAnalyzedWarning: false,
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
            // do not try to get the doc_values for IP fields, since it is
            // an internal representataion of the IP and so of no use for display.
            if (field.type !== 'ip' && field.doc_values) {
              output.params.docvalue_fields = [ field.name ];
            }
            output.params._source = field.name === '_source' ? true : field.name;
          }
        }
      },
      {
        name: 'sortField',
        type: 'field',
        editor: null,
        filterFieldTypes: [ 'number', 'date', 'ip',  'string' ],
        default: function (agg) {
          return agg.vis.indexPattern.timeFieldName;
        },
        write: _.noop // prevent default write, it is handled below
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
          const sortField = agg.params.sortField;
          const sortOrder = agg.params.sortOrder;

          if (sortField.scripted) {
            output.params.sort = [
              {
                _script: {
                  script: {
                    inline: sortField.script,
                    lang: sortField.lang
                  },
                  type: sortField.type,
                  order: sortOrder.val
                }
              }
            ];
          } else {
            output.params.sort = [
              {
                [ sortField.name ]: {
                  order: sortOrder.val
                }
              }
            ];
          }
        }
      }
    ],
    getValue(agg, bucket) {
      const hits = _.get(bucket, `${agg.id}.hits.hits`);
      if (!hits || !hits.length) {
        return null;
      }
      const path = agg.params.field.name;
      return path === '_source' ? hits[0]._source : agg.vis.indexPattern.flattenHit(hits[0])[path];
    }
  });
};
