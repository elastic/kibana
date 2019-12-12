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
import { BucketAggType } from './_bucket_agg_type';
import { FieldFormat, KBN_FIELD_TYPES } from '../../../../../../../plugins/data/public';
import { RangeKey } from './range_key';
import { RangesEditor } from './range_editor';

// @ts-ignore
import { createFilterRange } from './create_filter/range';
import { BUCKET_TYPES } from './bucket_agg_types';

const keyCaches = new WeakMap();
const formats = new WeakMap();

const rangeTitle = i18n.translate('common.ui.aggTypes.buckets.rangeTitle', {
  defaultMessage: 'Range',
});

export const rangeBucketAgg = new BucketAggType({
  name: BUCKET_TYPES.RANGE,
  title: rangeTitle,
  createFilter: createFilterRange,
  makeLabel(aggConfig) {
    return i18n.translate('common.ui.aggTypes.buckets.rangesLabel', {
      defaultMessage: '{fieldName} ranges',
      values: {
        fieldName: aggConfig.getFieldDisplayName(),
      },
    });
  },
  getKey(bucket, key, agg) {
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
  getFormat(agg) {
    let aggFormat = formats.get(agg);
    if (aggFormat) return aggFormat;

    const RangeFormat = FieldFormat.from((range: any) => {
      const format = agg.fieldOwnFormatter();
      const gte = '\u2265';
      const lt = '\u003c';
      return i18n.translate('common.ui.aggTypes.buckets.ranges.rangesFormatMessage', {
        defaultMessage: '{gte} {from} and {lt} {to}',
        values: {
          gte,
          from: format(range.gte),
          lt,
          to: format(range.lt),
        },
      });
    });

    aggFormat = new RangeFormat();

    formats.set(agg, aggFormat);
    return aggFormat;
  },
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: [KBN_FIELD_TYPES.NUMBER],
    },
    {
      name: 'ranges',
      default: [
        { from: 0, to: 1000 },
        { from: 1000, to: 2000 },
      ],
      editorComponent: RangesEditor,
      write(aggConfig, output) {
        output.params.ranges = aggConfig.params.ranges;
        output.params.keyed = true;
      },
    },
  ],
});
