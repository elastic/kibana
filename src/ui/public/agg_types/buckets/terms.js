import routeBasedNotifierProvider from 'ui/route_based_notifier';

define(function (require) {
  return function TermsAggDefinition(Private) {
    let _ = require('lodash');
    let BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    let bucketCountBetween = Private(require('ui/agg_types/buckets/_bucket_count_between'));
    let AggConfig = Private(require('ui/Vis/AggConfig'));
    let Schemas = Private(require('ui/Vis/Schemas'));
    let createFilter = Private(require('ui/agg_types/buckets/create_filter/terms'));
    const routeBasedNotifier = Private(routeBasedNotifierProvider);

    let orderAggSchema = (new Schemas([
      {
        group: 'none',
        name: 'orderAgg',
        title: 'Order Agg',
        aggFilter: ['!percentiles', '!median', '!std_dev']
      }
    ])).all[0];

    function isNotType(type) {
      return function (agg) {
        let field = agg.params.field;
        return !field || field.type !== type;
      };
    }

    return new BucketAggType({
      name: 'terms',
      title: 'Terms',
      makeLabel: function (agg) {
        let params = agg.params;
        return params.field.displayName + ': ' + params.order.display;
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
          advanced: true,
          disabled: isNotType('string')
        },
        {
          name: 'include',
          type: 'regex',
          advanced: true,
          disabled: isNotType('string')
        },
        {
          name: 'size',
          default: 5
        },
        {
          name: 'orderAgg',
          type: AggConfig,
          default: null,
          editor: require('ui/agg_types/controls/order_agg.html'),
          serialize: function (orderAgg) {
            return orderAgg.toJSON();
          },
          deserialize: function (state, agg) {
            return this.makeOrderAgg(agg, state);
          },
          makeOrderAgg: function (termsAgg, state) {
            state = state || {};
            state.schema = orderAggSchema;
            let orderAgg = new AggConfig(termsAgg.vis, state);
            orderAgg.id = termsAgg.id + '-orderAgg';
            return orderAgg;
          },
          controller: function ($scope) {
            $scope.safeMakeLabel = function (agg) {
              try {
                return agg.makeLabel();
              } catch (e) {
                return '- agg not valid -';
              }
            };

            let INIT = {}; // flag to know when prevOrderBy has changed
            let prevOrderBy = INIT;

            $scope.$watch('responseValueAggs', updateOrderAgg);
            $scope.$watch('agg.params.orderBy', updateOrderAgg);

            function updateOrderAgg() {
              let agg = $scope.agg;
              let aggs = agg.vis.aggs;
              let params = agg.params;
              let orderBy = params.orderBy;
              let paramDef = agg.type.params.byName.orderAgg;

              // setup the initial value of orderBy
              if (!orderBy && prevOrderBy === INIT) {
                // abort until we get the responseValueAggs
                if (!$scope.responseValueAggs) return;
                params.orderBy = (_.first($scope.responseValueAggs) || { id: 'custom' }).id;
                return;
              }

              // track the previous value
              prevOrderBy = orderBy;

              // we aren't creating a custom aggConfig
              if (!orderBy || orderBy !== 'custom') {
                params.orderAgg = null;

                if (orderBy === '_term') {
                  params.orderBy = '_term';
                  return;
                }

                // ensure that orderBy is set to a valid agg
                if (!_.find($scope.responseValueAggs, { id: orderBy })) {
                  params.orderBy = null;
                }
                return;
              }

              params.orderAgg = params.orderAgg || paramDef.makeOrderAgg(agg);
            }
          },
          write: function (agg, output) {
            let vis = agg.vis;
            let dir = agg.params.order.val;
            let order = output.params.order = {};

            let orderAgg = agg.params.orderAgg || vis.aggs.getResponseAggById(agg.params.orderBy);

            const orderBy = orderAgg.type.name;
            if (orderBy === 'count' && dir === 'asc') {
              routeBasedNotifier.warning('Sorting in Ascending order by Count in Terms aggregations is deprecated');
            }

            // TODO: This works around an Elasticsearch bug the always casts terms agg scripts to strings
            // thus causing issues with filtering. This probably causes other issues since float might not
            // be able to contain the number on the elasticsearch side
            if (output.params.script) {
              output.params.valueType = agg.field().type === 'number' ? 'float' : agg.field().type;
            }

            if (!orderAgg) {
              order[agg.params.orderBy || '_count'] = dir;
              return;
            }

            if (orderAgg.type.name === 'count') {
              order._count = dir;
              return;
            }

            let orderAggId = orderAgg.id;
            if (orderAgg.parentId) {
              orderAgg = vis.aggs.byId[orderAgg.parentId];
            }

            output.subAggs = (output.subAggs || []).concat(orderAgg);
            order[orderAggId] = dir;
          }
        },
        {
          name: 'order',
          type: 'optioned',
          default: 'desc',
          editor: require('ui/agg_types/controls/order_and_size.html'),
          options: [
            { display: 'Descending', val: 'desc' },
            { display: 'Ascending', val: 'asc' }
          ],
          write: _.noop // prevent default write, it's handled by orderAgg
        },
        {
          name: 'orderBy',
          write: _.noop // prevent default write, it's handled by orderAgg
        }
      ]
    });
  };
});
