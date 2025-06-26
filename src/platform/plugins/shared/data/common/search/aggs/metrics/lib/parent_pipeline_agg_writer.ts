/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IAggConfigs } from '../../agg_configs';
import { IMetricAggConfig } from '../metric_agg_type';

export const parentPipelineAggWriter = (
  agg: IMetricAggConfig,
  output: Record<string, any>,
  aggConfigs?: IAggConfigs
): void => {
  const customMetric = agg.getParam('customMetric');
  const metricAgg = agg.getParam('metricAgg');

  const selectedMetric = customMetric || (aggConfigs && aggConfigs.getResponseAggById(metricAgg));

  if (customMetric && customMetric.type.name !== 'count') {
    output.parentAggs = (output.parentAggs || []).concat(selectedMetric);
  }

  output.params = {
    buckets_path: selectedMetric.type.name === 'count' ? '_count' : selectedMetric.id,
  };
};
