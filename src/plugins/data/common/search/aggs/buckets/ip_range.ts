/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { noop, map, omitBy, isNull } from 'lodash';
import { i18n } from '@kbn/i18n';
import { cidrToAst, ipRangeToAst } from '../../expressions';

import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { createFilterIpRange } from './create_filter/ip_range';
import { IpRangeKey, RangeIpRangeAggKey, CidrMaskIpRangeAggKey } from './lib/ip_range';
import { aggIpRangeFnName } from './ip_range_fn';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

const ipRangeTitle = i18n.translate('data.search.aggs.buckets.ipRangeTitle', {
  defaultMessage: 'IP Range',
});

export enum IP_RANGE_TYPES {
  FROM_TO = 'fromTo',
  MASK = 'mask',
}

export interface AggParamsIpRange extends BaseAggParams {
  field: string;
  ipRangeType?: IP_RANGE_TYPES;
  ranges?: Partial<{
    [IP_RANGE_TYPES.FROM_TO]: RangeIpRangeAggKey[];
    [IP_RANGE_TYPES.MASK]: CidrMaskIpRangeAggKey[];
  }>;
}

export const getIpRangeBucketAgg = () =>
  new BucketAggType({
    name: BUCKET_TYPES.IP_RANGE,
    expressionName: aggIpRangeFnName,
    title: ipRangeTitle,
    createFilter: createFilterIpRange,
    getKey(bucket, key, agg): IpRangeKey {
      if (agg.params.ipRangeType === IP_RANGE_TYPES.MASK) {
        return { type: 'mask', mask: key };
      }
      return { type: 'range', from: bucket.from, to: bucket.to };
    },
    getSerializedFormat(agg) {
      return {
        id: 'ip_range',
        params: agg.params.field
          ? agg.aggConfigs.indexPattern.getFormatterForField(agg.params.field).toJSON()
          : {},
      };
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
        default: IP_RANGE_TYPES.FROM_TO,
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
        write(aggConfig, output) {
          const ipRangeType = aggConfig.params.ipRangeType;
          let ranges = aggConfig.params.ranges[ipRangeType];

          if (ipRangeType === IP_RANGE_TYPES.FROM_TO) {
            ranges = map(ranges, (range: any) => omitBy(range, isNull));
          }

          output.params.ranges = ranges;
        },
        toExpressionAst: (ranges: AggParamsIpRange['ranges']) => [
          ...map(ranges?.[IP_RANGE_TYPES.FROM_TO], ipRangeToAst),
          ...map(ranges?.[IP_RANGE_TYPES.MASK], cidrToAst),
        ],
      },
    ],
  });
