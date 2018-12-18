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

import { dateRange } from '../../utils/date_range';
import '../../directives/validate_date_math';
import '../../directives/documentation_href';
import { BucketAggType } from './_bucket_agg_type';
import { createFilterDateRange } from './create_filter/date_range';
import { fieldFormats } from '../../registry/field_formats';
import dateRangesTemplate from '../controls/date_ranges.html';
import { i18n } from '@kbn/i18n';

export const dateRangeBucketAgg = new BucketAggType({
  name: 'date_range',
  title: i18n.translate('common.ui.aggTypes.buckets.dateRangeTitle', {
    defaultMessage: 'Date Range',
  }),
  createFilter: createFilterDateRange,
  getKey: function (bucket, key, agg) {
    const formatter = agg.fieldOwnFormatter('text', fieldFormats.getDefaultInstance('date'));
    return dateRange.toString(bucket, formatter);
  },
  getFormat: function () {
    return fieldFormats.getDefaultInstance('string');
  },
  makeLabel: function (aggConfig) {
    return aggConfig.getFieldDisplayName() + ' date ranges';
  },
  params: [{
    name: 'field',
    type: 'field',
    filterFieldTypes: 'date',
    default: function (agg) {
      return agg.getIndexPattern().timeFieldName;
    }
  }, {
    name: 'ranges',
    default: [{
      from: 'now-1w/w',
      to: 'now'
    }],
    editor: dateRangesTemplate
  }]
});
