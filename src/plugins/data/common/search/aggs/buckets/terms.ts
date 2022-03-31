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
import { createFilterTerms } from './create_filter/terms';
import {
  isStringOrNumberType,
  migrateIncludeExcludeFormat,
} from './migrate_include_exclude_format';
import { aggTermsFnName } from './terms_fn';
import { AggConfigSerialized, BaseAggParams } from '../types';

import { KBN_FIELD_TYPES } from '../../../../common';

import {
  createOtherBucketPostFlightRequest,
  constructSingleTermOtherFilter,
} from './_terms_other_bucket_helper';
import { termsOrderAggParamDefinition } from './_terms_order_helper';

export { termsAggFilter } from './_terms_order_helper';

const termsTitle = i18n.translate('data.search.aggs.buckets.termsTitle', {
  defaultMessage: 'Terms',
});

export interface AggParamsTerms extends BaseAggParams {
  field: string;
  orderBy: string;
  orderAgg?: AggConfigSerialized;
  order?: 'asc' | 'desc';
  size?: number;
  shardSize?: number;
  missingBucket?: boolean;
  missingBucketLabel?: string;
  otherBucket?: boolean;
  otherBucketLabel?: string;
  // advanced
  exclude?: string;
  include?: string;
}

export const getTermsBucketAgg = () =>
  new BucketAggType({
    name: BUCKET_TYPES.TERMS,
    expressionName: aggTermsFnName,
    title: termsTitle,
    makeLabel(agg) {
      const params = agg.params;
      return agg.getFieldDisplayName() + ': ' + params.order.text;
    },
    getSerializedFormat(agg) {
      const format = agg.params.field
        ? agg.aggConfigs.indexPattern.getFormatterForField(agg.params.field).toJSON()
        : { id: undefined, params: undefined };
      return {
        id: 'terms',
        params: {
          id: format.id,
          otherBucketLabel: agg.params.otherBucketLabel,
          missingBucketLabel: agg.params.missingBucketLabel,
          ...format.params,
        },
      };
    },
    createFilter: createFilterTerms,
    postFlightRequest: createOtherBucketPostFlightRequest(constructSingleTermOtherFilter),
    hasPrecisionError: (aggBucket) => Boolean(aggBucket?.doc_count_error_upper_bound),
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
        name: 'shardSize',
        write: (aggConfig, output) => {
          output.params.shard_size = aggConfig.params.shardSize;
        },
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
        shouldShow: (agg) => agg.getParam('missingBucket'),
        write: noop,
      },
      {
        name: 'exclude',
        displayName: i18n.translate('data.search.aggs.buckets.terms.excludeLabel', {
          defaultMessage: 'Exclude',
        }),
        type: 'string',
        advanced: true,
        shouldShow: isStringOrNumberType,
        ...migrateIncludeExcludeFormat,
      },
      {
        name: 'include',
        displayName: i18n.translate('data.search.aggs.buckets.terms.includeLabel', {
          defaultMessage: 'Include',
        }),
        type: 'string',
        advanced: true,
        shouldShow: isStringOrNumberType,
        ...migrateIncludeExcludeFormat,
      },
    ],
  });
