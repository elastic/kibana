/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggParamsMapping, IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../../types';

const convertToPercentileAggParams = (agg: IAggConfig): AggParamsMapping['percentiles'] => {
  const { field, percents, percentile } = agg.params ?? {};
  return {
    field,
    percents: percents ? percents : [percentile],
  };
};

const convertToPercentileRankAggParams = (
  agg: IAggConfig
): AggParamsMapping['percentile_ranks'] => {
  const { field, values, value } = agg.params ?? {};
  return {
    field,
    values: values ? values : [value],
  };
};

const convertAggParams = (agg: IAggConfig): AggParamsMapping[METRIC_TYPES] => {
  switch (agg.type.name) {
    case METRIC_TYPES.PERCENTILES:
      return convertToPercentileAggParams(agg);
    case METRIC_TYPES.PERCENTILE_RANKS:
      return convertToPercentileRankAggParams(agg);
    default:
      return agg.params;
  }
};

export const convertToSchemaConfig = (agg: IAggConfig): SchemaConfig => {
  const aggType = agg.type.name as METRIC_TYPES;
  return {
    aggType,
    label: agg.makeLabel(),
    aggParams: convertAggParams(agg),
    params: {},
    format: agg.toSerializedFieldFormat() ?? {},
    accessor: 0,
  };
};
