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
  let BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  let bucketCountBetween = Private(AggTypesBucketsBucketCountBetweenProvider);
  let AggConfig = Private(VisAggConfigProvider);
  let Schemas = Private(VisSchemasProvider);
  let createFilter = Private(AggTypesBucketsCreateFilterTermsProvider);
  const routeBasedNotifier = Private(routeBasedNotifierProvider);

  const aggFilter = ['!top_hits', '!percentiles', '!median', '!std_dev'];
  let orderAggSchema = (new Schemas([
    {
      group: 'none',
      name: 'orderAgg',
      title: 'Order Agg',
      aggFilter: aggFilter
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

          // Returns true if the agg is not compatible with the terms bucket
          $scope.rejectAgg = function (agg) {
            // aggFilter elements all starts with a '!'
            // so the index of agg.type.name in a filter is 1 if it is included
            return Boolean(aggFilter.find((filter) => filter.indexOf(agg.type.name) === 1));
          };

          function updateOrderAgg() {
            let agg = $scope.agg;
            let params = agg.params;
            let orderBy = params.orderBy;
            let paramDef = agg.type.params.byName.orderAgg;

            // setup the initial value of orderBy
            if (!orderBy && prevOrderBy === INIT) {
              // abort until we get the responseValueAggs
              if (!$scope.responseValueAggs) return;
              let respAgg = _($scope.responseValueAggs).filter((agg) => !$scope.rejectAgg(agg)).first();
              if (!respAgg) {
                respAgg = { id: '_term' };
              }
              params.orderBy = respAgg.id;
              return;
            }

            // track the previous value
            prevOrderBy = orderBy;

            // we aren't creating a custom aggConfig
            if (!orderBy || orderBy !== 'custom') {
              params.orderAgg = null;
              // ensure that orderBy is set to a valid agg
              const respAgg = _($scope.responseValueAggs).filter((agg) => !$scope.rejectAgg(agg)).find({ id: orderBy });
              if (!respAgg) {
                params.orderBy = '_term';
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
