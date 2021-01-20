/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { find } from 'lodash';
import { IResponseAggConfig } from './lib/get_response_agg_config_class';

export const getPercentileValue = <TAggConfig extends IResponseAggConfig>(
  agg: TAggConfig,
  bucket: any
) => {
  const { values } = bucket[agg.parentId];

  const percentile: any = find(values, ({ key }) => key === agg.key);

  return percentile ? percentile.value : NaN;
};
