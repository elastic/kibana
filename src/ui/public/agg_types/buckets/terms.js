import _ from 'lodash';
import { AggTypesBucketsBucketAggTypeProvider } from './_bucket_agg_type';
import { AggConfig } from '../../vis/agg_config';
import { Schemas } from '../../vis/editors/default/schemas';
import { AggTypesBucketsCreateFilterTermsProvider } from './create_filter/terms';
import orderAggTemplate from '../controls/order_agg.html';
import orderAndSizeTemplate from '../controls/order_and_size.html';
import { RouteBasedNotifierProvider } from '../../route_based_notifier';
import { OtherBucketHelperProvider } from './_terms_other_bucket_helper';

export function AggTypesBucketsTermsProvider(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const createFilter = Private(AggTypesBucketsCreateFilterTermsProvider);
  const routeBasedNotifier = Private(RouteBasedNotifierProvider);
  const { buildOtherBucketAgg, mergeOtherBucketAggResponse, updateMissingBucket } = Private(OtherBucketHelperProvider);

  const aggFilter = [
    '!top_hits', '!percentiles', '!median', '!std_dev',
    '!derivative', '!moving_avg', '!serial_diff', '!cumulative_sum',
    '!avg_bucket', '!max_bucket', '!min_bucket', '!sum_bucket'
  ];

  const orderAggSchema = (new Schemas([
    {
      group: 'none',
      name: 'orderAgg',
      title: 'Order Agg',
      hideCustomLabel: true,
      aggFilter: aggFilter
    }
  ])).all[0];

  function isNotType(type) {
    return function (agg) {
      const field = agg.params.field;
      return !field || field.type !== type;
    };
  }

  const migrateIncludeExcludeFormat = {
    serialize: function (value) {
      if (!value || _.isString(value)) return value;
      else return value.pattern;
    },
    write: function (aggConfig, output) {
      const value = aggConfig.params[this.name];
      if (_.isObject(value)) {
        output.params[this.name] = value.pattern;
      } else if (value) {
        output.params[this.name] = value;
      }
    }
  };

  return new BucketAggType({
    name: 'terms',
    title: 'Terms',
    makeLabel: function (agg) {
      const params = agg.params;
      return agg.getFieldDisplayName() + ': ' + params.order.display;
    },
    createFilter: createFilter,
    postFlightRequest: async (resp, aggConfigs, aggConfig, nestedSearchSource) => {
      if (aggConfig.params.otherBucket) {
        const filterAgg = buildOtherBucketAgg(aggConfigs, aggConfig, resp);
        nestedSearchSource.set('aggs', filterAgg);
        const response = await nestedSearchSource.fetchAsRejectablePromise();
        resp = mergeOtherBucketAggResponse(aggConfigs, resp, response, aggConfig, filterAgg());
      }
      if (aggConfig.params.missingBucket) {
        resp = updateMissingBucket(resp, aggConfigs, aggConfig);
      }
      return resp;
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: ['number', 'boolean', 'date', 'ip',  'string']
      },
      {
        name: 'otherBucket',
        default: false,
        write: _.noop
      }, {
        name: 'otherBucketLabel',
        default: 'Other',
        write: _.noop
      }, {
        name: 'missingBucket',
        default: false,
        write: _.noop
      }, {
        name: 'missingBucketLabel',
        default: 'Missing',
        write: _.noop
      },
      {
        name: 'exclude',
        type: 'string',
        advanced: true,
        disabled: isNotType('string'),
        ...migrateIncludeExcludeFormat
      },
      {
        name: 'include',
        type: 'string',
        advanced: true,
        disabled: isNotType('string'),
        ...migrateIncludeExcludeFormat
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

          // Returns true if the agg is not compatible with the terms bucket
          $scope.rejectAgg = function rejectAgg(agg) {
            return aggFilter.includes(`!${agg.type.name}`);
          };

          $scope.$watch('agg.params.field.type', (type) => {
            if (type !== 'string') {
              $scope.agg.params.missingBucket = false;
            }
          });

          function updateOrderAgg() {
            // abort until we get the responseValueAggs
            if (!$scope.responseValueAggs) return;
            const agg = $scope.agg;
            const params = agg.params;
            const orderBy = params.orderBy;
            const paramDef = agg.type.params.byName.orderAgg;

            // setup the initial value of orderBy
            if (!orderBy && prevOrderBy === INIT) {
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

          if (agg.params.missingBucket && agg.params.field.type === 'string') {
            output.params.missing = '__missing__';
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
}
