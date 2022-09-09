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
import { isMetricWithField, getStdDeviationFormula } from '../convert';
import { getFormulaFromMetric, SUPPORTED_METRICS } from '../convert/supported_metrics';
import {
  getFieldNameFromField,
  isPercentileAgg,
  isPercentileRankAgg,
  isPipeline,
  isSchemaConfig,
  isStdDevAgg,
} from '../utils';

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
  agg: IAggConfig | SchemaConfig<METRIC_TYPES>,
  selector: string,
  reducedTimeRange?: string
) => {
  const type = isSchemaConfig(agg) ? agg.aggType : (agg.type.name as METRIC_TYPES);
  const op = SUPPORTED_METRICS[type];
  if (!op) {
    return null;
  }

  const formula = getFormulaFromMetric(op);
  return `${formula}(${selector ?? ''}${addTimeRangeToFormula(reducedTimeRange)})`;
};

const getFormulaForPercentileRanks = (
  agg: IAggConfig | SchemaConfig<METRIC_TYPES.PERCENTILE_RANKS>,
  selector: string,
  reducedTimeRange?: string
) => {
  const type = isSchemaConfig(agg) ? agg.aggType : (agg.type.name as METRIC_TYPES);
  const value = isSchemaConfig(agg) ? Number(agg.aggId?.split('.')[1]) : agg.params.value;
  const op = SUPPORTED_METRICS[type];
  if (!op) {
    return null;
  }

  const formula = getFormulaFromMetric(op);
  return `${formula}(${selector}, value=${value}${addTimeRangeToFormula(reducedTimeRange)})`;
};

const getFormulaForPercentile = (
  agg: IAggConfig | SchemaConfig<METRIC_TYPES.PERCENTILES>,
  selector: string,
  reducedTimeRange?: string
) => {
  const type = isSchemaConfig(agg) ? agg.aggType : (agg.type.name as METRIC_TYPES);
  const percentile = isSchemaConfig(agg) ? Number(agg.aggId?.split('.')[1]) : agg.params.percentile;
  const op = SUPPORTED_METRICS[type];
  if (!op) {
    return null;
  }

  const formula = getFormulaFromMetric(op);
  return `${formula}(${selector}, percentile=${percentile}${addTimeRangeToFormula(
    reducedTimeRange
  )})`;
};

const getFormulaForSubMetric = (agg: IAggConfig, reducedTimeRange?: string): string | null => {
  const op = SUPPORTED_METRICS[agg.type.name as METRIC_TYPES];
  if (!op) {
    return null;
  }

  if (PARENT_PIPELINE_AGGS.includes(op.name)) {
    return getFormulaForPipelineAgg(agg, reducedTimeRange);
  }

  if (METRIC_AGGS_WITHOUT_PARAMS.includes(op.name)) {
    return getFormulaForAggsWithoutParams(agg, agg.params.field?.displayName, reducedTimeRange);
  }

  if (op.name === Operations.PERCENTILE_RANK) {
    return getFormulaForPercentileRanks(agg, agg.params.field?.displayName, reducedTimeRange);
  }

  return null;
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

    const subFormula = getFormulaForSubMetric(agg.aggParams.customMetric);
    if (subFormula === null) {
      return null;
    }

    if (PARENT_PIPELINE_AGGS.includes(supportedAgg.name)) {
      const formula = getFormulaFromMetric(supportedAgg);
      return `${formula}(${subFormula})`;
    }

    return subFormula;
  }

  const op = SUPPORTED_METRICS[agg.type.name as METRIC_TYPES];
  if (!op) {
    return null;
  }
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

  if (PARENT_PIPELINE_AGGS.includes(op.name)) {
    const formula = getFormulaFromMetric(op);
    return `${formula}(${subFormula})`;
  }

  return subFormula;
};

export const getFormulaForAgg = (agg: SchemaConfig<METRIC_TYPES>) => {
  if (isPipeline(agg)) {
    return getFormulaForPipelineAgg(agg);
  }

  if (isPercentileAgg(agg)) {
    return getFormulaForPercentile(agg, getFieldNameFromField(agg.aggParams?.field) ?? '');
  }

  if (isPercentileRankAgg(agg)) {
    return getFormulaForPercentileRanks(agg, getFieldNameFromField(agg.aggParams?.field) ?? '');
  }

  if (isStdDevAgg(agg) && agg.aggId) {
    return getStdDeviationFormula(agg.aggId, getFieldNameFromField(agg.aggParams?.field) ?? '');
  }

  return getFormulaForAggsWithoutParams(
    agg,
    isMetricWithField(agg) ? getFieldNameFromField(agg.aggParams?.field) ?? '' : ''
  );
};
