/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { IpPrefix, ipPrefixToAst } from '../../expressions';

import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { createFilterIpPrefix } from './create_filter/ip_prefix';
import { IpPrefixKey } from './lib/ip_prefix';
import { aggIpPrefixFnName } from './ip_prefix_fn';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

const ipPrefixTitle = i18n.translate('data.search.aggs.buckets.ipPrefixTitle', {
  defaultMessage: 'IP Prefix',
});

export interface AggParamsIpPrefix extends BaseAggParams {
  field: string;
  ipPrefix?: IpPrefix;
}

export const getIpPrefixBucketAgg = () =>
  new BucketAggType({
    name: BUCKET_TYPES.IP_PREFIX,
    expressionName: aggIpPrefixFnName,
    title: ipPrefixTitle,
    createFilter: createFilterIpPrefix,
    getKey(bucket, key, agg): IpPrefixKey {
      return { type: 'ip_prefix', address: key, prefix_length: bucket.prefix_length };
    },
    getSerializedFormat(agg) {
      return {
        id: 'ip_prefix',
        params: agg.params.field
          ? agg.aggConfigs.indexPattern.getFormatterForField(agg.params.field).toJSON()
          : {},
      };
    },
    makeLabel(aggConfig) {
      return i18n.translate('data.search.aggs.buckets.ipPrefixLabel', {
        defaultMessage: '{fieldName} IP prefixes',
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
        name: 'ipPrefix',
        default: {
          prefixLength: 0,
          isIpv6: false,
        },
        write: (aggConfig, output) => {
          output.params.prefix_length = aggConfig.params.ipPrefix.prefixLength;
          output.params.is_ipv6 = aggConfig.params.ipPrefix.isIpv6;
        },
        toExpressionAst: ipPrefixToAst,
      },
    ],
  });
