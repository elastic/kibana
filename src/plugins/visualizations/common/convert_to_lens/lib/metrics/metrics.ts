/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { MinMax, PercentageModeConfig, SchemaConfig } from '../../..';
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
  ExtendedColumnConverterArgs,
  createFormulaColumn,
} from '../convert';
import { SUPPORTED_METRICS } from '../convert/supported_metrics';
import { getValidColumns } from '../utils';
import { getFormulaForAgg } from './formula';

const getPercentageFormulaOverRange = (formula: string, { min, max }: MinMax) =>
  `((${formula}) - ${min}) / (${max} - ${min})`;

// Lens is multiplying by 100, so, it is necessary to disable that operation.
const getPercentageFormula = (formula: string) => `(${formula}) / 10000`;

const convertToColumnInPercentageMode = (
  columnConverterArgs: ExtendedColumnConverterArgs<METRIC_TYPES>,
  minMax: MinMax | {}
) => {
  const formula = getFormulaForAgg(columnConverterArgs);
  if (formula === null) {
    return null;
  }

  const percentageModeFormula = isMinMax(minMax)
    ? getPercentageFormulaOverRange(formula, minMax)
    : getPercentageFormula(formula);
  const column = createFormulaColumn(percentageModeFormula, columnConverterArgs.agg);
  if (column === null) {
    return null;
  }
  return {
    ...column,
    params: { ...column?.params, format: { id: 'percent' } },
  };
};

const isMinMax = (minMax: MinMax | {}): minMax is MinMax => {
  if ((minMax as MinMax).min !== undefined && (minMax as MinMax).max !== undefined) {
    return true;
  }
  return false;
};

export const convertMetricToColumns = (
  agg: SchemaConfig<METRIC_TYPES>,
  dataView: DataView,
  aggs: Array<SchemaConfig<METRIC_TYPES>>,
  percentageModeConfig: PercentageModeConfig
): AggBasedColumn[] | null => {
  const supportedAgg = SUPPORTED_METRICS[agg.aggType];
  if (!supportedAgg) {
    return null;
  }

  if (percentageModeConfig.isPercentageColumn) {
    const { isPercentageColumn, ...minMax } = percentageModeConfig;

    const formulaColumn = convertToColumnInPercentageMode({ agg, dataView, aggs }, minMax);
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
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.STD_DEV: {
      const columns = convertToStdDeviationFormulaColumns({
        agg,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.PERCENTILES: {
      const columns = convertToPercentileColumn({
        agg,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.SINGLE_PERCENTILE: {
      const columns = convertToPercentileColumn({
        agg,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.PERCENTILE_RANKS: {
      const columns = convertToPercentileRankColumn({
        agg,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.SINGLE_PERCENTILE_RANK: {
      const columns = convertToPercentileRankColumn({
        agg,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.TOP_HITS:
    case METRIC_TYPES.TOP_METRICS: {
      const columns = convertToLastValueColumn({
        agg,
        dataView,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.CUMULATIVE_SUM: {
      const columns = convertToCumulativeSumAggColumn({
        agg,
        dataView,
        aggs,
      });
      return getValidColumns(columns);
    }
    case METRIC_TYPES.DERIVATIVE:
    case METRIC_TYPES.MOVING_FN: {
      const columns = convertToOtherParentPipelineAggColumns({
        agg,
        dataView,
        aggs,
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
      });
      return getValidColumns(columns);
    }
    default:
      return null;
  }
};
