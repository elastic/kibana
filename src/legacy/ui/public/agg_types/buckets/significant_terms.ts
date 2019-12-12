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

import { i18n } from '@kbn/i18n';
import { SizeParamEditor } from '../../vis/editors/default/controls/size';
import { BucketAggType } from './_bucket_agg_type';
import { createFilterTerms } from './create_filter/terms';
import { isStringType, migrateIncludeExcludeFormat } from './migrate_include_exclude_format';
import { BUCKET_TYPES } from './bucket_agg_types';
import { KBN_FIELD_TYPES } from '../../../../../plugins/data/public';

const significantTermsTitle = i18n.translate('common.ui.aggTypes.buckets.significantTermsTitle', {
  defaultMessage: 'Significant Terms',
});

export const significantTermsBucketAgg = new BucketAggType({
  name: BUCKET_TYPES.SIGNIFICANT_TERMS,
  title: significantTermsTitle,
  makeLabel(aggConfig) {
    return i18n.translate('common.ui.aggTypes.buckets.significantTermsLabel', {
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
      editorComponent: SizeParamEditor,
      default: '',
    },
    {
      name: 'exclude',
      displayName: i18n.translate('common.ui.aggTypes.buckets.significantTerms.excludeLabel', {
        defaultMessage: 'Exclude',
      }),
      type: 'string',
      advanced: true,
      shouldShow: isStringType,
      ...migrateIncludeExcludeFormat,
    },
    {
      name: 'include',
      displayName: i18n.translate('common.ui.aggTypes.buckets.significantTerms.includeLabel', {
        defaultMessage: 'Include',
      }),
      type: 'string',
      advanced: true,
      shouldShow: isStringType,
      ...migrateIncludeExcludeFormat,
    },
  ],
});
