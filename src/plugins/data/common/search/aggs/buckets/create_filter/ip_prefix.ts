/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildRangeFilter, RangeFilterParams } from '@kbn/es-query';
import { CidrMask } from '../lib/cidr_mask';
import { IBucketAggConfig } from '../bucket_agg_type';
import { IpPrefixKey } from '../lib/ip_prefix';

export const createFilterIpPrefix = (aggConfig: IBucketAggConfig, key: IpPrefixKey) => {
  let range: RangeFilterParams;

  range = new CidrMask(key.address + "/" + key.prefix_length).getRange();

  return buildRangeFilter(
    aggConfig.params.field,
    { gte: range.from, lte: range.to },
    aggConfig.getIndexPattern()
  );
};
