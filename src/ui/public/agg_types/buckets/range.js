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
import { createFilterRange } from './create_filter/range';
import { FieldFormat } from '../../../field_formats/field_format';
import { RangeKey } from './range_key';
import rangesTemplate from '../controls/ranges.html';
import { i18n } from '@kbn/i18n';

const keyCaches = new WeakMap();
const formats = new WeakMap();

export const rangeBucketAgg = new BucketAggType({
  name: 'range',
  title: i18n.translate('common.ui.aggTypes.buckets.rangeTitle', {
    defaultMessage: 'Range',
  }),
  createFilter: createFilterRange,
  makeLabel: function (aggConfig) {
    return i18n.translate('common.ui.aggTypes.buckets.rangesLabel', {
      defaultMessage: '{fieldName} ranges',
      values: {
        fieldName: aggConfig.getFieldDisplayName()
      }
    });
  },
  getKey: function (bucket, key, agg) {
    let keys = keyCaches.get(agg);

    if (!keys) {
      keys = new Map();
      keyCaches.set(agg, keys);
    }

    const id = RangeKey.idBucket(bucket);

    key = keys.get(id);
    if (!key) {
      key = new RangeKey(bucket);
      keys.set(id, key);
    }

    return key;
  },
  getFormat: function (agg) {
    let format = formats.get(agg);
    if (format) return format;

    const RangeFormat = FieldFormat.from(function (range) {
      const format = agg.fieldOwnFormatter();
      return i18n.translate('common.ui.aggTypes.buckets.ranges.rangesFormatMessage', {
        defaultMessage: '{from} to {to}',
        values: {
          from: format(range.gte),
          to: format(range.lt)
        }
      });
    });

    format = new RangeFormat();

    formats.set(agg, format);
    return format;
  },
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: ['number']
    },
    {
      name: 'ranges',
      default: [
        { from: 0, to: 1000 },
        { from: 1000, to: 2000 }
      ],
      editor: rangesTemplate,
      write: function (aggConfig, output) {
        output.params.ranges = aggConfig.params.ranges;
        output.params.keyed = true;
      }
    }
  ]
});
