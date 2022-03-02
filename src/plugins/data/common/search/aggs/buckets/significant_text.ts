/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { BucketAggType } from './bucket_agg_type';
import { migrateIncludeExcludeFormat } from './migrate_include_exclude_format';
import { BUCKET_TYPES } from './bucket_agg_types';
import { aggSignificantTextFnName } from './significant_text_fn';
import { KBN_FIELD_TYPES, ES_FIELD_TYPES } from '../../../../common';
import { BaseAggParams } from '../types';
import { createFilterTerms } from './create_filter/terms';

const significantTextTitle = i18n.translate('data.search.aggs.buckets.significantTextTitle', {
  defaultMessage: 'Significant Text',
});

export interface AggParamsSignificantText extends BaseAggParams {
  field: string;
  size?: number;
  min_doc_count?: number;
  filter_duplicate_text?: boolean;
  exclude?: string;
  include?: string;
}

export const getSignificantTextBucketAgg = () =>
  new BucketAggType({
    name: BUCKET_TYPES.SIGNIFICANT_TEXT,
    expressionName: aggSignificantTextFnName,
    title: significantTextTitle,
    makeLabel(aggConfig) {
      return i18n.translate('data.search.aggs.buckets.significantTextLabel', {
        defaultMessage: 'Top {size} unusual terms from "{fieldName}" text',
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
        /**
         * Significant text is available only for ES_FIELD_TYPES.TEXT,
         * This information is not available from field.type, so we have to check this using underlying esTypes
         */
        filterField: (field) =>
          Boolean(
            field.type === KBN_FIELD_TYPES.STRING && field.esTypes?.includes(ES_FIELD_TYPES.TEXT)
          ),
      },
      {
        name: 'size',
        type: 'number',
      },
      {
        name: 'min_doc_count',
        type: 'number',
      },
      {
        name: 'filter_duplicate_text',
        type: 'boolean',
      },
      {
        name: 'exclude',
        displayName: i18n.translate('data.search.aggs.buckets.significantText.excludeLabel', {
          defaultMessage: 'Exclude',
        }),
        type: 'string',
        advanced: true,
        ...migrateIncludeExcludeFormat,
      },
      {
        name: 'include',
        displayName: i18n.translate('data.search.aggs.buckets.significantText.includeLabel', {
          defaultMessage: 'Include',
        }),
        type: 'string',
        advanced: true,
        ...migrateIncludeExcludeFormat,
      },
    ],
  });
