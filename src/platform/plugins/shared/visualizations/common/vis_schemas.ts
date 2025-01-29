/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig, SupportedAggregation } from './types';

interface SchemaConfigParams {
  precision?: number;
  useGeocentroid?: boolean;
}

export function convertToSchemaConfig(agg: IAggConfig): SchemaConfig<METRIC_TYPES> {
  const aggType = agg.type.name as SupportedAggregation;
  const hasSubAgg = [
    'derivative',
    'moving_avg',
    'serial_diff',
    'cumulative_sum',
    'sum_bucket',
    'avg_bucket',
    'min_bucket',
    'max_bucket',
  ].includes(aggType);

  const formatAgg = hasSubAgg
    ? agg.params.customMetric || agg.aggConfigs.getRequestAggById(agg.params.metricAgg)
    : agg;

  const params: SchemaConfigParams = {};

  const label = agg.makeLabel && agg.makeLabel();
  return {
    accessor: 0,
    format: formatAgg.toSerializedFieldFormat(),
    params,
    label,
    aggType,
    aggId: agg.id,
    aggParams: agg.params,
  } as SchemaConfig<METRIC_TYPES>;
}
