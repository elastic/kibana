import _ from 'lodash';
import AggTypesAggTypeProvider from 'ui/agg_types/agg_type';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import topSortEditor from 'ui/agg_types/controls/top_sort.html';

export default function AggTypeMetricTopProvider(Private) {
  const AggType = Private(AggTypesAggTypeProvider);
  const fieldFormats = Private(RegistryFieldFormatsProvider);

  _.class(TopHitAggType).inherits(AggType);
  function TopHitAggType(config) {
    TopHitAggType.Super.call(this, config);
  }

  TopHitAggType.prototype.getValue = function (agg, bucket) {
    const hits = _.get(bucket, `${agg.id}.hits.hits`);
    if (!hits || !hits.length) {
      return null;
    }
    const path = agg.params.field.name;
    let values = agg.vis.indexPattern.formatField(hits[0], path);
    if (!_.isArray(values)) {
      values = [ values ];
    }

    if (!values.length && hits[0].fields) {
      // no values found in the source, check the doc_values fields
      values = hits[0].fields[path] || [];
    }

    switch (values.length) {
      case 0:
        return null;
      case 1:
        return _.isObject(values[0]) ? JSON.stringify(values[0], null, ' ') : values [0];
      default:
        return JSON.stringify(values, null, ' ');
    }
  };

  TopHitAggType.prototype.getFormat = function (agg) {
    return fieldFormats.getDefaultInstance('string');
  };

  return new TopHitAggType({
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
            output.params._source = field.name;
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
          output.params.sort = [
            {
              [ agg.params.sortField.name ]: {
                order: agg.params.sortOrder.val
              }
            }
          ];
        }
      }
    ]
  });
};
