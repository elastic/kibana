/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PartitionVisParams, ChartTypes } from '../../common/types';

export const filterOutConfig = (visType: ChartTypes, visConfig: PartitionVisParams) => {
  if ([ChartTypes.PIE, ChartTypes.DONUT].includes(visType)) {
    return visConfig;
  }

  const { last_level: lastLevel, truncate, ...restLabelsConfig } = visConfig.labels;

  return {
    ...visConfig,
    labels: restLabelsConfig,
  };
};
