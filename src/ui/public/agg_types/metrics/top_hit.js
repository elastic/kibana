import _ from 'lodash';
import MetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import topSortEditor from 'ui/agg_types/controls/top_sort.html';
import aggregateAndSizeEditor from 'ui/agg_types/controls/top_aggregate_and_size.html';

export default function AggTypeMetricTopProvider(Private) {
  const MetricAggType = Private(MetricAggTypeProvider);
  const fieldFormats = Private(RegistryFieldFormatsProvider);

  const isNumber = function (type) {
    return type === 'number';
  };

  return new MetricAggType({
    name: 'top_hits',
    title: 'Top Hit',
    makeLabel: function (aggConfig) {
      let prefix = aggConfig.params.sortOrder.val === 'desc' ? 'Last' : 'First';
      if (aggConfig.params.size !== 1) {
        prefix += ` ${aggConfig.params.size}`;
      }
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
          output.params = {};

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
        name: 'aggregate',
        type: 'optioned',
        default: 'concat',
        editor: aggregateAndSizeEditor,
        options: [
          {
            display: 'Min',
            isCompatibleType: isNumber,
            isCompatibleVis: _.constant(true),
            disabled: true,
            val: 'min'
          },
          {
            display: 'Max',
            isCompatibleType: isNumber,
            isCompatibleVis: _.constant(true),
            disabled: true,
            val: 'max'
          },
          {
            display: 'Sum',
            isCompatibleType: isNumber,
            isCompatibleVis: _.constant(true),
            disabled: true,
            val: 'sum'
          },
          {
            display: 'Average',
            isCompatibleType: isNumber,
            isCompatibleVis: _.constant(true),
            disabled: true,
            val: 'average'
          },
          {
            display: 'Concatenate',
            isCompatibleType: _.constant(true),
            isCompatibleVis: function (name) {
              return name === 'metric' || name === 'table';
            },
            disabled: true,
            val: 'concat'
          }
        ],
        controller: function ($scope) {
          $scope.options = _.cloneDeep($scope.aggParam.options);
          $scope.$watchGroup([ 'agg.vis.type.name', 'agg.params.field.type' ], function ([ visName, fieldType ]) {
            if (fieldType && visName) {
              _.each($scope.options, option => {
                option.disabled = !option.isCompatibleVis(visName) || !option.isCompatibleType(fieldType);
              });
            }
          });
        },
        write: _.noop
      },
      {
        name: 'size',
        editor: null, // size setting is done together with the aggregation setting
        default: 1
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
      let values = [];

      for (const hit of hits) {
        const hitValues = path === '_source' ? hit._source : agg.vis.indexPattern.flattenHit(hit, true)[path];
        if (_.isArray(hitValues)) {
          values.push(...hitValues);
        } else {
          values.push(hitValues);
        }
      }
      if (values.length === 1) {
        values = values[0];
      }

      if (_.isArray(values)) {
        switch (agg.params.aggregate.val) {
          case 'max':
            return _.max(values);
          case 'min':
            return _.min(values);
          case 'sum':
            return _.sum(values);
          case 'average':
            return _.sum(values) / values.length;
        }
      }
      return values;
    }
  });
}
