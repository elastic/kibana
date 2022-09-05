/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../..';
import { Operations } from '../../constants';
import { getFormulaFromMetric, SUPPORTED_METRICS } from '../convert/supported_metrics';

export const addTimeRangeToFormula = (reducedTimeRange?: string) => {
  return reducedTimeRange ? `, reducedTimeRange='${reducedTimeRange}'` : '';
};

const PARENT_PIPELINE_AGGS: string[] = [
  Operations.CUMULATIVE_SUM,
  Operations.DIFFERENCES,
  Operations.MOVING_AVERAGE,
];

const METRIC_AGGS_WITHOUT_PARAMS: string[] = [
  Operations.AVERAGE,
  Operations.MAX,
  Operations.MIN,
  Operations.SUM,
  Operations.UNIQUE_COUNT,
  Operations.COUNT,
];

const getFormulaForAggsWithoutParams = (
  agg: IAggConfig,
  selector: string,
  reducedTimeRange?: string
) => {
  const op = SUPPORTED_METRICS[agg.type.dslName as METRIC_TYPES];
  if (!op) {
    return null;
  }

  const formula = getFormulaFromMetric(op);
  return `${formula}(${selector}${addTimeRangeToFormula(reducedTimeRange)})`;
};

const getFormulaForPercentileRanks = (
  agg: IAggConfig,
  selector: string,
  reducedTimeRange?: string
) => {
  const op = SUPPORTED_METRICS[agg.type.dslName as METRIC_TYPES];
  if (!op) {
    return null;
  }

  const formula = getFormulaFromMetric(op);
  return `${formula}(${selector}, value=${agg.params.value}${addTimeRangeToFormula(
    reducedTimeRange
  )})`;
};

const getFormulaForSubMetric = (agg: IAggConfig, reducedTimeRange?: string): string | null => {
  const op = SUPPORTED_METRICS[agg.type.dslName as METRIC_TYPES];
  if (!op) {
    return null;
  }

  if (PARENT_PIPELINE_AGGS.includes(op.name)) {
    return getFormulaForPipelineAgg(agg, reducedTimeRange);
  }

  if (METRIC_AGGS_WITHOUT_PARAMS.includes(op.name)) {
    return getFormulaForAggsWithoutParams(agg, agg.params.field.displayName, reducedTimeRange);
  }

  if (op.name === Operations.PERCENTILE_RANK) {
    return getFormulaForPercentileRanks(agg, agg.params.field.displayName, reducedTimeRange);
  }

  return null;
};

const isSchemaConfig = (agg: SchemaConfig | IAggConfig): agg is SchemaConfig => {
  if ((agg as SchemaConfig).aggType) {
    return true;
  }
  return false;
};

export const getFormulaForPipelineAgg = (
  agg:
    | SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>
    | SchemaConfig<METRIC_TYPES.DERIVATIVE>
    | SchemaConfig<METRIC_TYPES.MOVING_FN>
    | SchemaConfig<METRIC_TYPES.AVG_BUCKET>
    | SchemaConfig<METRIC_TYPES.MAX_BUCKET>
    | SchemaConfig<METRIC_TYPES.MIN_BUCKET>
    | SchemaConfig<METRIC_TYPES.SUM_BUCKET>
    | IAggConfig,
  reducedTimeRange?: string
) => {
  if (isSchemaConfig(agg)) {
    const { aggType } = agg;
    const supportedAgg = SUPPORTED_METRICS[aggType];
    if (!supportedAgg) {
      return null;
    }

    if (!agg.aggParams || !agg.aggParams.customMetric) {
      return null;
    }

    const formula = getFormulaFromMetric(supportedAgg);
    const subFormula = getFormulaForSubMetric(agg.aggParams.customMetric);
    if (subFormula === null) {
      return null;
    }

    return `${formula}(${subFormula})`;
  }

  const op = SUPPORTED_METRICS[agg.type.dslName as METRIC_TYPES];
  if (!op) {
    return null;
  }
  const formula = getFormulaFromMetric(op);
  if (!agg.params.customMetric) {
    return null;
  }

  const subFormula = getFormulaForSubMetric(
    agg.params.customMetric as IAggConfig,
    reducedTimeRange
  );
  if (!subFormula) {
    return null;
  }

  return `${formula}(${subFormula})`;
};
