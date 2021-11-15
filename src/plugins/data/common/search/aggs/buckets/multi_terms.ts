/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { noop } from 'lodash';
import { i18n } from '@kbn/i18n';

import moment from 'moment';
import { BucketAggType, IBucketAggConfig } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { createFilterMultiTerms } from './create_filter/multi_terms';
import {
  isStringOrNumberType,
  migrateIncludeExcludeFormat,
} from './migrate_include_exclude_format';
import { aggTermsFnName } from './terms_fn';
import { AggConfigSerialized, BaseAggParams } from '../types';

import { KBN_FIELD_TYPES } from '../../../../common';

import {
  buildOtherBucketAgg,
  mergeOtherBucketAggResponse,
  updateMissingBucket,
  constructMultiTermOtherFilter,
} from './_terms_other_bucket_helper';
import { MultiFieldKey } from './multi_field_key';

export const multiTermsAggFilter = [
  '!top_hits',
  '!percentiles',
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

const termsTitle = i18n.translate('data.search.aggs.buckets.multiTermsTitle', {
  defaultMessage: 'Multi-Terms',
});

export interface AggParamsMultiTerms extends BaseAggParams {
  fields: string[];
  orderBy: string;
  orderAgg?: AggConfigSerialized;
  order?: 'asc' | 'desc';
  size?: number;
  otherBucket?: boolean;
  otherBucketLabel?: string;
  separatorLabel?: string;
}

export const getMultiTermsBucketAgg = () => {
  const keyCaches = new WeakMap();
  return new BucketAggType({
    name: BUCKET_TYPES.MULTI_TERMS,
    expressionName: aggTermsFnName,
    title: termsTitle,
    makeLabel(agg) {
      const params = agg.params;
      return agg.getFieldDisplayName() + ': ' + params.order.text;
    },
    getKey(bucket, key, agg) {
      let keys = keyCaches.get(agg);

      if (!keys) {
        keys = new Map();
        keyCaches.set(agg, keys);
      }

      const id = MultiFieldKey.idBucket(bucket);

      key = keys.get(id);
      if (!key) {
        key = new MultiFieldKey(bucket);
        keys.set(id, key);
      }

      return key;
    },
    getSerializedFormat(agg) {
      const formats = agg.params.fields
        ? agg.params.fields.map((field) =>
            agg.aggConfigs.indexPattern.getFormatterForField(field).toJSON()
          )
        : [{ id: undefined, params: undefined }];
      // TODO implement this formatter
      return {
        id: 'multi_terms',
        params: {
          otherBucketLabel: agg.params.otherBucketLabel,
          paramsPerField: formats,
          separator: agg.params.separatorLabel,
        },
      };
    },
    createFilter: createFilterMultiTerms,
    postFlightRequest: async (
      resp,
      aggConfigs,
      aggConfig,
      searchSource,
      inspectorRequestAdapter,
      abortSignal,
      searchSessionId
    ) => {
      if (!resp.aggregations) return resp;
      const nestedSearchSource = searchSource.createChild();
      if (aggConfig.params.otherBucket) {
        const filterAgg = buildOtherBucketAgg(aggConfigs, aggConfig, resp);
        if (!filterAgg) return resp;

        nestedSearchSource.setField('aggs', filterAgg);

        const { rawResponse: response } = await nestedSearchSource
          .fetch$({
            abortSignal,
            sessionId: searchSessionId,
            inspector: {
              adapter: inspectorRequestAdapter,
              title: i18n.translate('data.search.aggs.buckets.multiTerms.otherBucketTitle', {
                defaultMessage: 'Other bucket',
              }),
              description: i18n.translate(
                'data.search.aggs.buckets.multiTerms.otherBucketDescription',
                {
                  defaultMessage:
                    'This request counts the number of documents that fall ' +
                    'outside the criterion of the data buckets.',
                }
              ),
            },
          })
          .toPromise();

        resp = mergeOtherBucketAggResponse(
          aggConfigs,
          resp,
          response,
          aggConfig,
          filterAgg(),
          constructMultiTermOtherFilter
        );
      }
      if (aggConfig.params.missingBucket) {
        resp = updateMissingBucket(resp, aggConfigs, aggConfig);
      }
      return resp;
    },
    params: [
      {
        name: 'fields',
        write(agg, output, aggs) {
          output.params.terms = agg.params.fields.map((field) => ({ field }));
        },
      },
      {
        name: 'orderBy',
        write: noop, // prevent default write, it's handled by orderAgg
      },
      {
        name: 'orderAgg',
        type: 'agg',
        allowedAggs: multiTermsAggFilter,
        default: null,
        makeAgg(termsAgg, state = { type: 'count' }) {
          state.schema = 'orderAgg';
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

          if (
            aggs?.hasTimeShifts() &&
            Object.keys(aggs?.getTimeShifts()).length > 1 &&
            aggs.timeRange
          ) {
            const shift = orderAgg.getTimeShift();
            orderAgg = aggs.createAggConfig(
              {
                type: 'filtered_metric',
                id: orderAgg.id,
                params: {
                  customBucket: aggs
                    .createAggConfig(
                      {
                        type: 'filter',
                        id: 'shift',
                        params: {
                          filter: {
                            language: 'lucene',
                            query: {
                              range: {
                                [aggs.timeFields![0]]: {
                                  gte: moment(aggs.timeRange.from)
                                    .subtract(shift || 0)
                                    .toISOString(),
                                  lte: moment(aggs.timeRange.to)
                                    .subtract(shift || 0)
                                    .toISOString(),
                                },
                              },
                            },
                          },
                        },
                      },
                      {
                        addToAggConfigs: false,
                      }
                    )
                    .serialize(),
                  customMetric: orderAgg.serialize(),
                },
                enabled: false,
              },
              {
                addToAggConfigs: false,
              }
            );
          }
          if (orderAgg.type.name === 'count') {
            order._count = dir;
            return;
          }

          const orderAggPath = orderAgg.getValueBucketPath();

          if (orderAgg.parentId && aggs) {
            orderAgg = aggs.byId(orderAgg.parentId);
          }

          output.subAggs = (output.subAggs || []).concat(orderAgg);
          order[orderAggPath] = dir;
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
        shouldShow: (agg) => agg.getParam('otherBucket'),
        write: noop,
      },
      {
        name: 'separatorLabel',
        type: 'string',
        write: noop,
      },
    ],
  });
};
