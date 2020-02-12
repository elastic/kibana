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

import { noop } from 'lodash';
import { i18n } from '@kbn/i18n';
import { getRequestInspectorStats, getResponseInspectorStats } from '../../../index';
import { BucketAggType } from './_bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { IBucketAggConfig } from './_bucket_agg_type';
import { createFilterTerms } from './create_filter/terms';
import { isStringType, migrateIncludeExcludeFormat } from './migrate_include_exclude_format';
import { IAggConfigs } from '../agg_configs';

import { Adapters } from '../../../../../../../plugins/inspector/public';
import {
  ISearchSource,
  IFieldFormat,
  FieldFormatsContentType,
  KBN_FIELD_TYPES,
} from '../../../../../../../plugins/data/public';

import {
  buildOtherBucketAgg,
  mergeOtherBucketAggResponse,
  updateMissingBucket,
  // @ts-ignore
} from './_terms_other_bucket_helper';
import { Schemas } from '../schemas';
import { AggGroupNames } from '../agg_groups';

export const termsAggFilter = [
  '!top_hits',
  '!percentiles',
  '!median',
  '!std_dev',
  '!derivative',
  '!moving_avg',
  '!serial_diff',
  '!cumulative_sum',
  '!avg_bucket',
  '!max_bucket',
  '!min_bucket',
  '!sum_bucket',
];

const [orderAggSchema] = new Schemas([
  {
    group: AggGroupNames.None,
    name: 'orderAgg',
    // This string is never visible to the user so it doesn't need to be translated
    title: 'Order Agg',
    hideCustomLabel: true,
    aggFilter: termsAggFilter,
  },
]).all;

const termsTitle = i18n.translate('data.search.aggs.buckets.termsTitle', {
  defaultMessage: 'Terms',
});

export const termsBucketAgg = new BucketAggType({
  name: BUCKET_TYPES.TERMS,
  title: termsTitle,
  makeLabel(agg) {
    const params = agg.params;
    return agg.getFieldDisplayName() + ': ' + params.order.text;
  },
  getFormat(bucket): IFieldFormat {
    return {
      getConverterFor: (type: FieldFormatsContentType) => {
        return (val: any) => {
          if (val === '__other__') {
            return bucket.params.otherBucketLabel;
          }
          if (val === '__missing__') {
            return bucket.params.missingBucketLabel;
          }

          return bucket.params.field.format.convert(val, type);
        };
      },
    } as IFieldFormat;
  },
  createFilter: createFilterTerms,
  postFlightRequest: async (
    resp: any,
    aggConfigs: IAggConfigs,
    aggConfig: IBucketAggConfig,
    searchSource: ISearchSource,
    inspectorAdapters: Adapters,
    abortSignal?: AbortSignal
  ) => {
    if (!resp.aggregations) return resp;
    const nestedSearchSource = searchSource.createChild();
    if (aggConfig.params.otherBucket) {
      const filterAgg = buildOtherBucketAgg(aggConfigs, aggConfig, resp);
      if (!filterAgg) return resp;

      nestedSearchSource.setField('aggs', filterAgg);

      const request = inspectorAdapters.requests.start(
        i18n.translate('data.search.aggs.buckets.terms.otherBucketTitle', {
          defaultMessage: 'Other bucket',
        }),
        {
          description: i18n.translate('data.search.aggs.buckets.terms.otherBucketDescription', {
            defaultMessage:
              'This request counts the number of documents that fall ' +
              'outside the criterion of the data buckets.',
          }),
        }
      );
      nestedSearchSource.getSearchRequestBody().then((body: string) => {
        request.json(body);
      });
      request.stats(getRequestInspectorStats(nestedSearchSource));

      const response = await nestedSearchSource.fetch({ abortSignal });
      request.stats(getResponseInspectorStats(nestedSearchSource, response)).ok({ json: response });
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
      filterFieldTypes: [
        KBN_FIELD_TYPES.NUMBER,
        KBN_FIELD_TYPES.BOOLEAN,
        KBN_FIELD_TYPES.DATE,
        KBN_FIELD_TYPES.IP,
        KBN_FIELD_TYPES.STRING,
      ],
    },
    {
      name: 'orderBy',
      write: noop, // prevent default write, it's handled by orderAgg
    },
    {
      name: 'orderAgg',
      type: 'agg',
      default: null,
      makeAgg(termsAgg, state) {
        state = state || {};
        state.schema = orderAggSchema;
        const orderAgg = termsAgg.aggConfigs.createAggConfig<IBucketAggConfig>(state, {
          addToAggConfigs: false,
        });
        orderAgg.id = termsAgg.id + '-orderAgg';

        return orderAgg;
      },
      write(agg, output, aggs) {
        const dir = agg.params.order.value;
        const order: Record<string, any> = (output.params.order = {});

        let orderAgg = agg.params.orderAgg || aggs!.getResponseAggById(agg.params.orderBy);

        // TODO: This works around an Elasticsearch bug the always casts terms agg scripts to strings
        // thus causing issues with filtering. This probably causes other issues since float might not
        // be able to contain the number on the elasticsearch side
        if (output.params.script) {
          output.params.value_type =
            agg.getField().type === 'number' ? 'float' : agg.getField().type;
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

        if (orderAgg.parentId && aggs) {
          orderAgg = aggs.byId(orderAgg.parentId);
        }

        output.subAggs = (output.subAggs || []).concat(orderAgg);
        order[orderAggId] = dir;
      },
    },
    {
      name: 'order',
      type: 'optioned',
      default: 'desc',
      options: [
        {
          text: i18n.translate('data.search.aggs.buckets.terms.orderDescendingTitle', {
            defaultMessage: 'Descending',
          }),
          value: 'desc',
        },
        {
          text: i18n.translate('data.search.aggs.buckets.terms.orderAscendingTitle', {
            defaultMessage: 'Ascending',
          }),
          value: 'asc',
        },
      ],
      write: noop, // prevent default write, it's handled by orderAgg
    },
    {
      name: 'size',
      default: 5,
    },
    {
      name: 'otherBucket',
      default: false,
      write: noop,
    },
    {
      name: 'otherBucketLabel',
      type: 'string',
      default: i18n.translate('data.search.aggs.buckets.terms.otherBucketLabel', {
        defaultMessage: 'Other',
      }),
      displayName: i18n.translate('data.search.aggs.otherBucket.labelForOtherBucketLabel', {
        defaultMessage: 'Label for other bucket',
      }),
      shouldShow: agg => agg.getParam('otherBucket'),
      write: noop,
    },
    {
      name: 'missingBucket',
      default: false,
      write: noop,
    },
    {
      name: 'missingBucketLabel',
      default: i18n.translate('data.search.aggs.buckets.terms.missingBucketLabel', {
        defaultMessage: 'Missing',
        description: `Default label used in charts when documents are missing a field.
          Visible when you create a chart with a terms aggregation and enable "Show missing values"`,
      }),
      type: 'string',
      displayName: i18n.translate('data.search.aggs.otherBucket.labelForMissingValuesLabel', {
        defaultMessage: 'Label for missing values',
      }),
      shouldShow: agg => agg.getParam('missingBucket'),
      write: noop,
    },
    {
      name: 'exclude',
      displayName: i18n.translate('data.search.aggs.buckets.terms.excludeLabel', {
        defaultMessage: 'Exclude',
      }),
      type: 'string',
      advanced: true,
      shouldShow: isStringType,
      ...migrateIncludeExcludeFormat,
    },
    {
      name: 'include',
      displayName: i18n.translate('data.search.aggs.buckets.terms.includeLabel', {
        defaultMessage: 'Include',
      }),
      type: 'string',
      advanced: true,
      shouldShow: isStringType,
      ...migrateIncludeExcludeFormat,
    },
  ],
});
