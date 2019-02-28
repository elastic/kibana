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

import { BucketAggType } from './_bucket_agg_type';
import { createFilterTerms } from './create_filter/terms';
import orderAndSizeTemplate from '../controls/order_and_size.html';
import { i18n } from '@kbn/i18n';

export const significantTermsBucketAgg = new BucketAggType({
  name: 'significant_terms',
  title: i18n.translate('common.ui.aggTypes.buckets.significantTermsTitle', {
    defaultMessage: 'Significant Terms',
  }),
  makeLabel: function (aggConfig) {
    return i18n.translate('common.ui.aggTypes.buckets.significantTermsLabel', {
      defaultMessage: 'Top {size} unusual terms in {fieldName}',
      values: {
        size: aggConfig.params.size,
        fieldName: aggConfig.getFieldDisplayName(),
      }
    });
  },
  createFilter: createFilterTerms,
  params: [
    {
      name: 'field',
      type: 'field',
      scriptable: false,
      filterFieldTypes: 'string'
    },
    {
      name: 'size',
      editor: orderAndSizeTemplate,
    },
    {
      name: 'exclude',
      type: 'regex',
      advanced: true
    },
    {
      name: 'include',
      type: 'regex',
      advanced: true
    }
  ]
});
