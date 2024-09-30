/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { PercentageModeConfig } from '../../..';
import {
  convertMetricAggregationColumnWithoutSpecialParams,
  convertToOtherParentPipelineAggColumns,
  convertToPercentileColumn,
  convertToPercentileRankColumn,
  convertToSiblingPipelineColumns,
  convertToStdDeviationFormulaColumns,
  convertToLastValueColumn,
  convertToCumulativeSumAggColumn,
  AggBasedColumn,
  convertToColumnInPercentageMode,
  ExtendedColumnConverterArgs,
} from '../convert';
import { SUPPORTED_METRICS } from '../convert/supported_metrics';
import { getValidColumns } from '../utils';

export const convertMetricToColumns = (
  { agg, dataView, aggs, visType }: ExtendedColumnConverterArgs<METRIC_TYPES>,
  percentageModeConfig: PercentageModeConfig = { isPercentageMode: false }
): AggBasedColumn[] | null => {
  const supportedAgg = SUPPORTED_METRICS[agg.aggType];
  if (!supportedAgg) {
    return null;
  }

  if (percentageModeConfig.isPercentageMode) {
    const { isPercentageMode, ...minMax } = percentageModeConfig;

    const formulaColumn = convertToColumnInPercentageMode({ agg, dataView, aggs, visType }, minMax);
    return getValidColumns(formulaColumn);
  }

  switch (agg.aggType) {
    case METRIC_TYPES.AVG:
    case METRIC_TYPES.MIN:
    case METRIC_TYPES.MAX:
    case METRIC_TYPES.SUM:
    case METRIC_TYPES.COUNT:
    case METRIC_TYPES.CARDINALITY:
    case METRIC_TYPES.VALUE_COUNT:
    case METRIC_TYPES.MEDIAN: {
      const columns = convertMetricAggregationColumnWithoutSpecialParams(supportedAgg, {
        agg,
        dataView,
        visType,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.STD_DEV: {
      const columns = convertToStdDeviationFormulaColumns({
        agg,
        dataView,
        visType,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.PERCENTILES: {
      const columns = convertToPercentileColumn({
        agg,
        dataView,
        visType,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.SINGLE_PERCENTILE: {
      const columns = convertToPercentileColumn({
        agg,
        dataView,
        visType,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.PERCENTILE_RANKS: {
      const columns = convertToPercentileRankColumn({
        agg,
        dataView,
        visType,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.SINGLE_PERCENTILE_RANK: {
      const columns = convertToPercentileRankColumn({
        agg,
        dataView,
        visType,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.TOP_HITS:
    case METRIC_TYPES.TOP_METRICS: {
      const columns = convertToLastValueColumn({
        agg,
        dataView,
        visType,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.CUMULATIVE_SUM: {
      const columns = convertToCumulativeSumAggColumn({
        agg,
        dataView,
        aggs,
        visType,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.DERIVATIVE:
    case METRIC_TYPES.MOVING_FN: {
      const columns = convertToOtherParentPipelineAggColumns({
        agg,
        dataView,
        aggs,
        visType,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.SUM_BUCKET:
    case METRIC_TYPES.MIN_BUCKET:
    case METRIC_TYPES.MAX_BUCKET:
    case METRIC_TYPES.AVG_BUCKET: {
      const columns = convertToSiblingPipelineColumns({
        agg,
        dataView,
        aggs,
        visType,
      });
      return getValidColumns(columns);
    }
    default:
      return null;
  }
};
