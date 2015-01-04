define(function (require) {
  return function TermsAggDefinition(Private) {
    var _ = require('lodash');
    var AggType = Private(require('components/agg_types/_agg_type'));
    var AggConfig = Private(require('components/vis/_agg_config'));
    var createFilter = Private(require('components/agg_types/buckets/create_filter/terms'));

    return new AggType({
      name: 'terms',
      title: 'Terms',
      makeLabel: function (agg) {
        var params = agg.params;
        return params.order.display + ' ' + params.size + ' ' + params.field.displayName;
      },
      createFilter: createFilter,
      params: [
        {
          name: 'field',
          scriptable: true,
          filterFieldTypes: ['number', 'boolean', 'date', 'ip',  'string']
        },
        {
          name: 'exclude',
          type: 'regex',
          advanced: true
        },
        {
          name: 'include',
          type: 'regex',
          advanced: true
        },
        {
          name: 'size',
          default: 5
        },
        {
          name: 'order',
          type: 'optioned',
          default: 'desc',
          editor: require('text!components/agg_types/controls/order_and_size.html'),
          options: [
            { display: 'Top', val: 'desc' },
            { display: 'Bottom', val: 'asc' }
          ],
          write: _.noop // prevent default write, it's handled by orderAgg
        },
        {
          name: 'orderBy',
          type: 'optioned',
          default: 'count',
          options: [
            { display: 'Document Count', val: 'count' },
            { display: 'Custom Metric', val: 'agg' }
          ],
          write: _.noop // prevent default write, it's handled by orderAgg
        },
        {
          name: 'orderAgg',
          type: AggConfig,
          default: null,
          editor: require('text!components/agg_types/controls/order_agg.html'),
          serialize: function (orderAgg) {
            return orderAgg.toJSON();
          },
          deserialize: function (stateJSON, aggConfig) {
            return new AggConfig(aggConfig.vis, stateJSON);
          },
          controller: function ($scope) {
            $scope.$watch('params.orderBy', function (orderBy) {
              if (!orderBy) return;
              if (orderBy.val !== 'agg') {
                $scope.params.orderAgg = null;
                return;
              }
              if ($scope.params.orderAgg) return;

              var agg = $scope.aggConfig;
              $scope.params.orderAgg = new AggConfig(agg.vis, {
                schema: _.first(agg.vis.type.schemas.metrics)
              });
            });
          },
          write: function (agg, output) {
            var dir = agg.params.order.val;
            var order = output.params.order = {};

            if (agg.params.orderAgg) {
              output.subAggs = (output.subAggs || []).concat(agg.params.orderAgg);
              order[agg.params.orderAgg.id] = dir;
            } else {
              order._count = dir;
            }
          }
        }
      ]
    });
  };
});
