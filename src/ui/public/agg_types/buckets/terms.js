import _ from 'lodash';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import AggTypesBucketsBucketCountBetweenProvider from 'ui/agg_types/buckets/_bucket_count_between';
import VisAggConfigProvider from 'ui/vis/agg_config';
import VisSchemasProvider from 'ui/vis/schemas';
import AggTypesBucketsCreateFilterTermsProvider from 'ui/agg_types/buckets/create_filter/terms';
import orderAggTemplate from 'ui/agg_types/controls/order_agg.html';
import orderAndSizeTemplate from 'ui/agg_types/controls/order_and_size.html';
import routeBasedNotifierProvider from 'ui/route_based_notifier';

export default function TermsAggDefinition(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const bucketCountBetween = Private(AggTypesBucketsBucketCountBetweenProvider);
  const AggConfig = Private(VisAggConfigProvider);
  const Schemas = Private(VisSchemasProvider);
  const createFilter = Private(AggTypesBucketsCreateFilterTermsProvider);
  const routeBasedNotifier = Private(routeBasedNotifierProvider);

  const orderAggSchema = (new Schemas([
    {
      group: 'none',
      name: 'orderAgg',
      title: 'Order Agg',
      aggFilter: ['!percentiles', '!median', '!std_dev']
    }
  ])).all[0];

  function isNotType(type) {
    return function (agg) {
      const field = agg.params.field;
      return !field || field.type !== type;
    };
  }

  return new BucketAggType({
    name: 'terms',
    title: 'Terms',
    makeLabel: function (agg) {
      const params = agg.params;
      return agg.getFieldDisplayName() + ': ' + params.order.display;
    },
    createFilter: createFilter,
    params: [
      {
        name: 'field',
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
        editor: orderAggTemplate,
        serialize: function (orderAgg) {
          return orderAgg.toJSON();
        },
        deserialize: function (state, agg) {
          return this.makeOrderAgg(agg, state);
        },
        makeOrderAgg: function (termsAgg, state) {
          state = state || {};
          state.schema = orderAggSchema;
          const orderAgg = new AggConfig(termsAgg.vis, state);
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

          const INIT = {}; // flag to know when prevOrderBy has changed
          let prevOrderBy = INIT;

          $scope.$watch('responseValueAggs', updateOrderAgg);
          $scope.$watch('agg.params.orderBy', updateOrderAgg);

          function updateOrderAgg() {
            const agg = $scope.agg;
            const aggs = agg.vis.aggs;
            const params = agg.params;
            const orderBy = params.orderBy;
            const paramDef = agg.type.params.byName.orderAgg;

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
          const vis = agg.vis;
          const dir = agg.params.order.val;
          const order = output.params.order = {};

          let orderAgg = agg.params.orderAgg || vis.aggs.getResponseAggById(agg.params.orderBy);

          // TODO: This works around an Elasticsearch bug the always casts terms agg scripts to strings
          // thus causing issues with filtering. This probably causes other issues since float might not
          // be able to contain the number on the elasticsearch side
          if (output.params.script) {
            output.params.valueType = agg.getField().type === 'number' ? 'float' : agg.getField().type;
          }

          if (!orderAgg) {
            order[agg.params.orderBy || '_count'] = dir;
            return;
          }

          if (orderAgg.type.name === 'count') {
            if (dir === 'asc') {
              routeBasedNotifier.warning('Sorting in Ascending order by Count in Terms aggregations is deprecated');
            }
            order._count = dir;
            return;
          }

          const orderAggId = orderAgg.id;
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
        editor: orderAndSizeTemplate,
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
