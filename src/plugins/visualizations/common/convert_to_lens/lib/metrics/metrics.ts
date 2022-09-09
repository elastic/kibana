/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BUCKET_TYPES, METRIC_TYPES } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { SchemaConfig } from '../../..';
import {
  convertMetricAggregationColumnWithoutSpecialParams,
  MetricsWithoutSpecialParams,
  convertToParentPipelineAggColumns,
  convertToPercentileColumn,
  convertToPercentileRankColumn,
  convertToSiblingPipelineColumns,
  convertToStdDeviationFormulaColumns,
  SiblingPipelineMetric,
  ParentPipelineMetric,
  convertToLastValueColumn,
} from '../convert';
import { SUPPORTED_METRICS } from '../convert/supported_metrics';
import { Column } from '../../types';
import { getValidColumns } from '../utils';

export const convertMetricToColumns = <T extends METRIC_TYPES | BUCKET_TYPES>(
  agg: SchemaConfig<T>,
  dataView: DataView
): Column[] | null => {
  const supportedAgg = SUPPORTED_METRICS[agg.aggType];
  if (!supportedAgg) {
    return null;
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
        agg: agg as SchemaConfig<MetricsWithoutSpecialParams>,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.STD_DEV: {
      const columns = convertToStdDeviationFormulaColumns({
        agg: agg as SchemaConfig<METRIC_TYPES.STD_DEV>,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.PERCENTILES: {
      const columns = convertToPercentileColumn({
        agg: agg as SchemaConfig<METRIC_TYPES.PERCENTILES>,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.PERCENTILE_RANKS: {
      const columns = convertToPercentileRankColumn({
        agg: agg as SchemaConfig<METRIC_TYPES.PERCENTILE_RANKS>,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.TOP_HITS:
    case METRIC_TYPES.TOP_METRICS: {
      const columns = convertToLastValueColumn({
        agg: agg as SchemaConfig<METRIC_TYPES.TOP_HITS> | SchemaConfig<METRIC_TYPES.TOP_METRICS>,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.CUMULATIVE_SUM:
    case METRIC_TYPES.DERIVATIVE:
    case METRIC_TYPES.MOVING_FN: {
      const columns = convertToParentPipelineAggColumns({
        agg: agg as SchemaConfig<ParentPipelineMetric>,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.SUM_BUCKET:
    case METRIC_TYPES.MIN_BUCKET:
    case METRIC_TYPES.MAX_BUCKET:
    case METRIC_TYPES.AVG_BUCKET: {
      const columns = convertToSiblingPipelineColumns({
        agg: agg as SchemaConfig<SiblingPipelineMetric>,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.SERIAL_DIFF:
      return null;
    default:
      return null;
  }
};
