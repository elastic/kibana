/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import chrome from 'ui/chrome';
import { BucketAggType } from './_bucket_agg_type';
import { AggConfig } from '../../vis/agg_config';
import { Schemas } from '../../vis/editors/default/schemas';
import { createFilterTerms } from './create_filter/terms';
import orderAggTemplate from '../controls/order_agg.html';
import orderAndSizeTemplate from '../controls/order_and_size.html';
import otherBucketTemplate from '../controls/other_bucket.html';
import { i18n } from '@kbn/i18n';

import { getRequestInspectorStats, getResponseInspectorStats } from '../../courier/utils/courier_inspector_utils';
import { buildOtherBucketAgg, mergeOtherBucketAggResponse, updateMissingBucket } from './_terms_other_bucket_helper';

const aggFilter = [
  '!top_hits', '!percentiles', '!median', '!std_dev',
  '!derivative', '!moving_avg', '!serial_diff', '!cumulative_sum',
  '!avg_bucket', '!max_bucket', '!min_bucket', '!sum_bucket'
];

const orderAggSchema = (new Schemas([
  {
    group: 'none',
    name: 'orderAgg',
    title: i18n.translate('common.ui.aggTypes.buckets.terms.orderAggTitle', {
      defaultMessage: 'Order Agg',
    }),
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

export const termsBucketAgg = new BucketAggType({
  name: 'terms',
  title: i18n.translate('common.ui.aggTypes.buckets.termsTitle', {
    defaultMessage: 'Terms',
  }),
  makeLabel: function (agg) {
    const params = agg.params;
    return agg.getFieldDisplayName() + ': ' + params.order.display;
  },
  getFormat: function (bucket) {
    return {
      getConverterFor: (type) => {
        return (val) => {
          if (val === '__other__') {
            return bucket.params.otherBucketLabel;
          }
          if (val === '__missing__') {
            return bucket.params.missingBucketLabel;
          }
          const parsedUrl = {
            origin: window.location.origin,
            pathname: window.location.pathname,
            basePath: chrome.getBasePath(),
          };
          const converter = bucket.params.field.format.getConverterFor(type);
          return converter(val, undefined, undefined, parsedUrl);
        };
      }
    };
  },
  createFilter: createFilterTerms,
  postFlightRequest: async (resp, aggConfigs, aggConfig, searchSource, inspectorAdapters) => {
    const nestedSearchSource = searchSource.createChild();
    if (aggConfig.params.otherBucket) {
      const filterAgg = buildOtherBucketAgg(aggConfigs, aggConfig, resp);
      nestedSearchSource.setField('aggs', filterAgg);

      const request = inspectorAdapters.requests.start(
        i18n.translate('common.ui.aggTypes.buckets.terms.otherBucketTitle', { defaultMessage: 'Other bucket' }),
        {
          description: i18n.translate('common.ui.aggTypes.buckets.terms.otherBucketDescription', {
            defaultMessage: 'This request counts the number of documents that fall ' +
              'outside the criterion of the data buckets.'
          }),
        }
      );
      nestedSearchSource.getSearchRequestBody().then(body => {
        request.json(body);
      });
      request.stats(getRequestInspectorStats(nestedSearchSource));

      const response = await nestedSearchSource.fetch();
      request
        .stats(getResponseInspectorStats(nestedSearchSource, response))
        .ok({ json: response });
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
      type: 'field',
      filterFieldTypes: ['number', 'boolean', 'date', 'ip',  'string']
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
        const orderAgg = termsAgg.aggConfigs.createAggConfig(state, { addToAggConfigs: false });
        orderAgg.id = termsAgg.id + '-orderAgg';
        return orderAgg;
      },
      controller: function ($scope) {
        $scope.safeMakeLabel = function (agg) {
          try {
            return agg.makeLabel();
          } catch (e) {
            return i18n.translate('common.ui.aggTypes.buckets.terms.aggNotValidLabel', {
              defaultMessage: '- agg not valid -',
            });
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
              respAgg = { id: '_key' };
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
              params.orderBy = '_key';
            }
            return;
          }

          params.orderAgg = params.orderAgg || paramDef.makeOrderAgg(agg);
        }
      },
      write: function (agg, output, aggs) {
        const dir = agg.params.order.val;
        const order = output.params.order = {};

        let orderAgg = agg.params.orderAgg || aggs.getResponseAggById(agg.params.orderBy);

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
          order._count = dir;
          return;
        }

        const orderAggId = orderAgg.id;
        if (orderAgg.parentId) {
          orderAgg = aggs.byId[orderAgg.parentId];
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
        {
          display: i18n.translate('common.ui.aggTypes.buckets.terms.orderDescendingTitle', {
            defaultMessage: 'Descending',
          }),
          val: 'desc'
        },
        {
          display: i18n.translate('common.ui.aggTypes.buckets.terms.orderAscendingTitle', {
            defaultMessage: 'Ascending',
          }),
          val: 'asc'
        }
      ],
      write: _.noop // prevent default write, it's handled by orderAgg
    },
    {
      name: 'orderBy',
      write: _.noop // prevent default write, it's handled by orderAgg
    },
    {
      name: 'otherBucket',
      default: false,
      editor: otherBucketTemplate,
      write: _.noop
    }, {
      name: 'otherBucketLabel',
      default: i18n.translate('common.ui.aggTypes.buckets.terms.otherBucketLabel', {
        defaultMessage: 'Other',
      }),
      write: _.noop
    }, {
      name: 'missingBucket',
      default: false,
      write: _.noop
    }, {
      name: 'missingBucketLabel',
      default: i18n.translate('common.ui.aggTypes.buckets.terms.missingBucketLabel', {
        defaultMessage: 'Missing',
      }),
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
    }
  ]
});
