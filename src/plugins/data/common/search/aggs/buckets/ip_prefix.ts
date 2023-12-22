/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { createFilterIpPrefix } from './create_filter/ip_prefix';
import { aggIpPrefixFnName } from './ip_prefix_fn';
import { KBN_FIELD_TYPES } from '../../..';
import { BaseAggParams } from '../types';

const ipPrefixTitle = i18n.translate('data.search.aggs.buckets.ipPrefixTitle', {
  defaultMessage: 'IP Prefix',
});

export interface IpPrefixAggKey {
  prefixLength: string;
  isIpv6: boolean;
}

export interface AggParamsIpPrefix extends BaseAggParams {
  field: string;
  ipPrefix?: IpPrefixAggKey;
}

export const getIpPrefixBucketAgg = () =>
  new BucketAggType({
    name: BUCKET_TYPES.IP_PREFIX,
    expressionName: aggIpPrefixFnName,
    title: ipPrefixTitle,
    createFilter: createFilterIpPrefix,
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
          prefixLength: 1,
          isIpv6: false,
        },
        write: (aggConfig, output) => {
	  console.log(aggConfig);
          output.params.prefix_length = aggConfig.params.ipPrefix.prefixLength;
          output.params.is_ipv6 = aggConfig.params.ipPrefix.isIpv6;
        },
      },
    ],
  });
