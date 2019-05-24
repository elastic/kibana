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

import _ from 'lodash';
import { BucketAggType } from './_bucket_agg_type';
import { createFilterIpRange } from './create_filter/ip_range';
import { IpRangeTypeParamEditor } from '../controls/ip_range_type';
import { IpRangesParamEditor } from '../controls/ip_ranges';
import { i18n } from '@kbn/i18n';

export const ipRangeBucketAgg = new BucketAggType({
  name: 'ip_range',
  title: i18n.translate('common.ui.aggTypes.buckets.ipRangeTitle', {
    defaultMessage: 'IPv4 Range',
  }),
  createFilter: createFilterIpRange,
  getKey: function (bucket, key) {
    if (key) return key;
    const from = _.get(bucket, 'from', '-Infinity');
    const to = _.get(bucket, 'to', 'Infinity');
    return `${from} to ${to}`;
  },
  makeLabel: function (aggConfig) {
    return i18n.translate('common.ui.aggTypes.buckets.ipRangeLabel', {
      defaultMessage: '{fieldName} IP ranges',
      values: {
        fieldName: aggConfig.getFieldDisplayName()
      }
    });
  },
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: 'ip'
    }, {
      name: 'ipRangeType',
      editorComponent: IpRangeTypeParamEditor,
      default: 'fromTo',
      write: _.noop
    }, {
      name: 'ranges',
      default: {
        fromTo: [
          { from: '0.0.0.0', to: '127.255.255.255' },
          { from: '128.0.0.0', to: '191.255.255.255' }
        ],
        mask: [
          { mask: '0.0.0.0/1' },
          { mask: '128.0.0.0/2' }
        ]
      },
      editorComponent: IpRangesParamEditor,
      write: function (aggConfig, output) {
        const ipRangeType = aggConfig.params.ipRangeType;
        let ranges = aggConfig.params.ranges[ipRangeType];

        if (ipRangeType === 'fromTo') {
          ranges = _.map(ranges, (range) => {
            return _.omit(range, _.isNull);
          });
        }

        output.params.ranges = ranges;
      }
    }
  ]
});
