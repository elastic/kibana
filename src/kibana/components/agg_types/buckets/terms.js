define(function (require) {
  return function TermsAggDefinition(Private) {
    var _ = require('lodash');
    var BucketAggType = Private(require('components/agg_types/buckets/_bucket_agg_type'));
    var bucketCountBetween = Private(require('components/agg_types/buckets/_bucket_count_between'));
    var AggConfig = Private(require('components/vis/_agg_config'));
    var createFilter = Private(require('components/agg_types/buckets/create_filter/terms'));

    return new BucketAggType({
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
          deserialize: function (stateJSON, agg) {
            return new AggConfig(agg.vis, stateJSON);
          },
          controller: function ($scope) {
            $scope.safeMakeLabel = function (agg) {
              try {
                return agg.makeLabel();
              } catch (e) {
                return '- agg not valid -';
              }
            };

            $scope.$watch('agg.params.orderBy', function (orderBy, prevOrderBy) {
              var agg = $scope.agg;
              var aggs = agg.vis.aggs;
              var params = agg.params;

              if (orderBy === prevOrderBy && !orderBy) {
                params.orderBy = (_.first(aggs.bySchemaGroup.metrics) || { id: 'custom' }).id;
                return;
              }

              if (!orderBy) return;
              if (orderBy !== 'custom') {
                params.orderAgg = null;
                return;
              }
              if (params.orderAgg) return;

              params.orderAgg = new AggConfig(agg.vis, {
                schema: _.first(agg.vis.type.schemas.metrics)
              });
            });
          },
          write: function (agg, output) {
            var dir = agg.params.order.val;
            var order = output.params.order = {};

            var orderAgg = agg.params.orderAgg;
            if (!orderAgg) {
              orderAgg = agg.vis.aggs.byId[agg.params.orderBy];
            }

            output.subAggs = (output.subAggs || []).concat(orderAgg);
            order[orderAgg.id] = dir;
          }
        }
      ]
    });
  };
});
