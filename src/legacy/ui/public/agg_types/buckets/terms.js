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
import { OrderParamEditor } from '../controls/order';
import { SizeParamEditor } from '../controls/size';
import { wrapWithInlineComp } from './_inline_comp_wrapper';
import { i18n } from '@kbn/i18n';

import { getRequestInspectorStats, getResponseInspectorStats } from '../../courier/utils/courier_inspector_utils';
import { buildOtherBucketAgg, mergeOtherBucketAggResponse, updateMissingBucket } from './_terms_other_bucket_helper';
import { MissingBucketParamEditor } from '../controls/missing_bucket';
import { OtherBucketParamEditor } from '../controls/other_bucket';
import { isStringType, migrateIncludeExcludeFormat } from './migrate_include_exclude_format';

const aggFilter = [
  '!top_hits', '!percentiles', '!median', '!std_dev',
  '!derivative', '!moving_avg', '!serial_diff', '!cumulative_sum',
  '!avg_bucket', '!max_bucket', '!min_bucket', '!sum_bucket'
];

const orderAggSchema = (new Schemas([
  {
    group: 'none',
    name: 'orderAgg',
    // This string is never visible to the user so it doesn't need to be translated
    title: 'Order Agg',
    hideCustomLabel: true,
    aggFilter: aggFilter
  }
])).all[0];

export const termsBucketAgg = new BucketAggType({
  name: 'terms',
  title: i18n.translate('common.ui.aggTypes.buckets.termsTitle', {
    defaultMessage: 'Terms',
  }),
  makeLabel: function (agg) {
    const params = agg.params;
    return agg.getFieldDisplayName() + ': ' + params.order.text;
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
        const dir = agg.params.order.value;
        const order = output.params.order = {};

        let orderAgg = agg.params.orderAgg || aggs.getResponseAggById(agg.params.orderBy);

        // TODO: This works around an Elasticsearch bug the always casts terms agg scripts to strings
        // thus causing issues with filtering. This probably causes other issues since float might not
        // be able to contain the number on the elasticsearch side
        if (output.params.script) {
          output.params.value_type = agg.getField().type === 'number' ? 'float' : agg.getField().type;
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
      type: 'select',
      default: 'desc',
      editorComponent: wrapWithInlineComp(OrderParamEditor),
      options: [
        {
          text: i18n.translate('common.ui.aggTypes.buckets.terms.orderDescendingTitle', {
            defaultMessage: 'Descending',
          }),
          value: 'desc'
        },
        {
          text: i18n.translate('common.ui.aggTypes.buckets.terms.orderAscendingTitle', {
            defaultMessage: 'Ascending',
          }),
          value: 'asc'
        }
      ],
      write: _.noop // prevent default write, it's handled by orderAgg
    },
    {
      name: 'size',
      editorComponent: wrapWithInlineComp(SizeParamEditor),
      default: 5
    },
    {
      name: 'orderBy',
      write: _.noop // prevent default write, it's handled by orderAgg
    },
    {
      name: 'otherBucket',
      default: false,
      editorComponent: OtherBucketParamEditor,
      write: _.noop,
    },
    {
      name: 'otherBucketLabel',
      type: 'string',
      default: i18n.translate('common.ui.aggTypes.buckets.terms.otherBucketLabel', {
        defaultMessage: 'Other',
      }),
      displayName: i18n.translate('common.ui.aggTypes.otherBucket.labelForOtherBucketLabel', {
        defaultMessage: 'Label for other bucket',
      }),
      shouldShow: agg => agg.params.otherBucket,
      write: _.noop,
    },
    {
      name: 'missingBucket',
      default: false,
      editorComponent: MissingBucketParamEditor,
      write: _.noop,
    },
    {
      name: 'missingBucketLabel',
      default: i18n.translate('common.ui.aggTypes.buckets.terms.missingBucketLabel', {
        defaultMessage: 'Missing',
        description: `Default label used in charts when documents are missing a field.
          Visible when you create a chart with a terms aggregation and enable "Show missing values"`,
      }),
      type: 'string',
      displayName: i18n.translate('common.ui.aggTypes.otherBucket.labelForMissingValuesLabel', {
        defaultMessage: 'Label for missing values',
      }),
      shouldShow: agg => agg.params.missingBucket,
      write: _.noop,
    },
    {
      name: 'exclude',
      displayName: i18n.translate('common.ui.aggTypes.buckets.terms.excludeLabel', { defaultMessage: 'Exclude' }),
      type: 'string',
      advanced: true,
      shouldShow: isStringType,
      ...migrateIncludeExcludeFormat
    },
    {
      name: 'include',
      displayName: i18n.translate('common.ui.aggTypes.buckets.terms.includeLabel', { defaultMessage: 'Include' }),
      type: 'string',
      advanced: true,
      shouldShow: isStringType,
      ...migrateIncludeExcludeFormat
    },
  ]
});
