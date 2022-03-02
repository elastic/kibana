/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { noop } from 'lodash';
import { i18n } from '@kbn/i18n';

import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { createFilterMultiTerms } from './create_filter/multi_terms';
import { aggMultiTermsFnName } from './multi_terms_fn';
import { AggConfigSerialized, BaseAggParams } from '../types';

import { MultiFieldKey } from './multi_field_key';
import {
  createOtherBucketPostFlightRequest,
  constructMultiTermOtherFilter,
} from './_terms_other_bucket_helper';
import { termsOrderAggParamDefinition } from './_terms_order_helper';

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
    expressionName: aggMultiTermsFnName,
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
      const params = agg.params as AggParamsMultiTerms;
      const formats = params.fields
        ? params.fields.map((field) => {
            const fieldSpec = agg.aggConfigs.indexPattern.getFieldByName(field);
            if (!fieldSpec) {
              return {
                id: undefined,
                params: undefined,
              };
            }
            return agg.aggConfigs.indexPattern.getFormatterForField(fieldSpec).toJSON();
          })
        : [{ id: undefined, params: undefined }];
      return {
        id: 'multi_terms',
        params: {
          otherBucketLabel: params.otherBucketLabel,
          paramsPerField: formats,
          separator: agg.params.separatorLabel,
        },
      };
    },
    createFilter: createFilterMultiTerms,
    postFlightRequest: createOtherBucketPostFlightRequest(constructMultiTermOtherFilter),
    params: [
      {
        name: 'fields',
        write(agg, output, aggs) {
          const params = agg.params as AggParamsMultiTerms;
          output.params.terms = params.fields.map((field) => ({ field }));
        },
      },
      {
        name: 'orderBy',
        write: noop, // prevent default write, it's handled by orderAgg
      },
      termsOrderAggParamDefinition,
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
