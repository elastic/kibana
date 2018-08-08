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
import '../../directives/validate_ip';
import '../../directives/validate_cidr_mask';
import { BucketAggType } from './_bucket_agg_type';
import { createFilterIpRange } from './create_filter/ip_range';
import ipRangesTemplate from '../controls/ip_ranges.html';

export const ipRangeBucketAgg = new BucketAggType({
  name: 'ip_range',
  title: 'IPv4 Range',
  createFilter: createFilterIpRange,
  getKey: function (bucket, key) {
    if (key) return key;
    const from = _.get(bucket, 'from', '-Infinity');
    const to = _.get(bucket, 'to', 'Infinity');
    return `${from} to ${to}`;
  },
  makeLabel: function (aggConfig) {
    return aggConfig.getFieldDisplayName() + ' IP ranges';
  },
  params: [
    {
      name: 'field',
      filterFieldTypes: 'ip'
    }, {
      name: 'ipRangeType',
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
      editor: ipRangesTemplate,
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
