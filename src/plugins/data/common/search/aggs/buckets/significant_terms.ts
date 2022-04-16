/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { BucketAggType } from './bucket_agg_type';
import { createFilterTerms } from './create_filter/terms';
import { isStringType, migrateIncludeExcludeFormat } from './migrate_include_exclude_format';
import { BUCKET_TYPES } from './bucket_agg_types';
import { aggSignificantTermsFnName } from './significant_terms_fn';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

const significantTermsTitle = i18n.translate('data.search.aggs.buckets.significantTermsTitle', {
  defaultMessage: 'Significant Terms',
});

export interface AggParamsSignificantTerms extends BaseAggParams {
  field: string;
  size?: number;
  exclude?: string;
  include?: string;
}

export const getSignificantTermsBucketAgg = () =>
  new BucketAggType({
    name: BUCKET_TYPES.SIGNIFICANT_TERMS,
    expressionName: aggSignificantTermsFnName,
    title: significantTermsTitle,
    makeLabel(aggConfig) {
      return i18n.translate('data.search.aggs.buckets.significantTermsLabel', {
        defaultMessage: 'Top {size} unusual terms in {fieldName}',
        values: {
          size: aggConfig.params.size,
          fieldName: aggConfig.getFieldDisplayName(),
        },
      });
    },
    createFilter: createFilterTerms,
    params: [
      {
        name: 'field',
        type: 'field',
        scriptable: false,
        filterFieldTypes: KBN_FIELD_TYPES.STRING,
      },
      {
        name: 'size',
        default: '',
      },
      {
        name: 'exclude',
        displayName: i18n.translate('data.search.aggs.buckets.significantTerms.excludeLabel', {
          defaultMessage: 'Exclude',
        }),
        type: 'string',
        advanced: true,
        shouldShow: isStringType,
        ...migrateIncludeExcludeFormat,
      },
      {
        name: 'include',
        displayName: i18n.translate('data.search.aggs.buckets.significantTerms.includeLabel', {
          defaultMessage: 'Include',
        }),
        type: 'string',
        advanced: true,
        shouldShow: isStringType,
        ...migrateIncludeExcludeFormat,
      },
    ],
  });
