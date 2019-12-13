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

import { isNull, map, noop, omit } from 'lodash';
import { i18n } from '@kbn/i18n';

import { npStart } from 'ui/new_platform';
import { IpRangesParamEditor } from 'ui/vis/editors/default/controls/ip_ranges';
import { IpRangeTypeParamEditor } from 'ui/vis/editors/default/controls/ip_range_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { createFilterIpRange } from './create_filter/ip_range';
import { BucketAggType } from './_bucket_agg_type';

import {
  FieldFormat,
  KBN_FIELD_TYPES,
  TEXT_CONTEXT_TYPE,
} from '../../../../../../../plugins/data/public';

const ipRangeTitle = i18n.translate('data.search.aggs.buckets.ipRangeTitle', {
  defaultMessage: 'IPv4 Range',
});

export type IpRangeKey =
  | { type: 'mask'; mask: string }
  | { type: 'range'; from: string; to: string };

export const ipRangeBucketAgg = new BucketAggType({
  name: BUCKET_TYPES.IP_RANGE,
  title: ipRangeTitle,
  createFilter: createFilterIpRange,
  getKey(bucket, key, agg): IpRangeKey {
    if (agg.params.ipRangeType === 'mask') {
      return { type: 'mask', mask: key };
    }
    return { type: 'range', from: bucket.from, to: bucket.to };
  },
  getFormat(agg) {
    const fieldFormats = npStart.plugins.data.fieldFormats;
    const formatter = agg.fieldOwnFormatter(
      TEXT_CONTEXT_TYPE,
      fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.IP)
    );
    const IpRangeFormat = FieldFormat.from(function(range: IpRangeKey) {
      return convertIPRangeToString(range, formatter);
    });
    return new IpRangeFormat();
  },
  makeLabel(aggConfig) {
    return i18n.translate('data.search.aggs.buckets.ipRangeLabel', {
      defaultMessage: '{fieldName} IP ranges',
      values: {
        fieldName: aggConfig.getFieldDisplayName(),
      },
    });
  },
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: KBN_FIELD_TYPES.IP,
    },
    {
      name: 'ipRangeType',
      editorComponent: IpRangeTypeParamEditor,
      default: 'fromTo',
      write: noop,
    },
    {
      name: 'ranges',
      default: {
        fromTo: [
          { from: '0.0.0.0', to: '127.255.255.255' },
          { from: '128.0.0.0', to: '191.255.255.255' },
        ],
        mask: [{ mask: '0.0.0.0/1' }, { mask: '128.0.0.0/2' }],
      },
      editorComponent: IpRangesParamEditor,
      write(aggConfig, output) {
        const ipRangeType = aggConfig.params.ipRangeType;
        let ranges = aggConfig.params.ranges[ipRangeType];

        if (ipRangeType === 'fromTo') {
          ranges = map(ranges, (range: any) => omit(range, isNull));
        }

        output.params.ranges = ranges;
      },
    },
  ],
});

export const convertIPRangeToString = (range: IpRangeKey, format: (val: any) => string) => {
  if (range.type === 'mask') {
    return format(range.mask);
  }
  const from = range.from ? format(range.from) : '-Infinity';
  const to = range.to ? format(range.to) : 'Infinity';

  return `${from} to ${to}`;
};
