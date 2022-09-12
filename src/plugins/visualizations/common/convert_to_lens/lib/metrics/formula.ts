/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { convertToSchemaConfig } from '../../../vis_schemas';
import { SchemaConfig } from '../../..';
import { Operations } from '../../constants';
import { isMetricWithField, getStdDeviationFormula } from '../convert';
import { getFormulaFromMetric, SUPPORTED_METRICS } from '../convert/supported_metrics';
import {
  getFieldNameFromField,
  isPercentileAgg,
  isPercentileRankAgg,
  isPipeline,
  isStdDevAgg,
} from '../utils';

type PipelineAggs = SchemaConfig<
  | METRIC_TYPES.CUMULATIVE_SUM
  | METRIC_TYPES.DERIVATIVE
  | METRIC_TYPES.MOVING_FN
  | METRIC_TYPES.AVG_BUCKET
  | METRIC_TYPES.MAX_BUCKET
  | METRIC_TYPES.MIN_BUCKET
  | METRIC_TYPES.SUM_BUCKET
>;

type MetricAggsWithoutParams = SchemaConfig<
  | METRIC_TYPES.AVG
  | METRIC_TYPES.MAX
  | METRIC_TYPES.MIN
  | METRIC_TYPES.SUM
  | METRIC_TYPES.CARDINALITY
  | METRIC_TYPES.COUNT
>;

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
  agg: SchemaConfig<METRIC_TYPES>,
  selector: string | undefined,
  reducedTimeRange?: string
) => {
  const op = SUPPORTED_METRICS[agg.aggType];
  if (!op) {
    return null;
  }

  const formula = getFormulaFromMetric(op);
  return `${formula}(${selector ?? ''}${addTimeRangeToFormula(reducedTimeRange)})`;
};

const getFormulaForPercentileRanks = (
  agg: SchemaConfig<METRIC_TYPES.PERCENTILE_RANKS>,
  selector: string | undefined,
  reducedTimeRange?: string
) => {
  const value = Number(agg.aggId?.split('.')[1]);
  const op = SUPPORTED_METRICS[agg.aggType];
  if (!op) {
    return null;
  }

  const formula = getFormulaFromMetric(op);
  return `${formula}(${selector}, value=${value}${addTimeRangeToFormula(reducedTimeRange)})`;
};

const getFormulaForPercentile = (
  agg: SchemaConfig<METRIC_TYPES.PERCENTILES>,
  selector: string,
  reducedTimeRange?: string
) => {
  const percentile = Number(agg.aggId?.split('.')[1]);
  const op = SUPPORTED_METRICS[agg.aggType];
  if (!op) {
    return null;
  }

  const formula = getFormulaFromMetric(op);
  return `${formula}(${selector}, percentile=${percentile}${addTimeRangeToFormula(
    reducedTimeRange
  )})`;
};

const getFormulaForSubMetric = (agg: SchemaConfig, reducedTimeRange?: string): string | null => {
  const op = SUPPORTED_METRICS[agg.aggType];
  if (!op) {
    return null;
  }

  if (PARENT_PIPELINE_AGGS.includes(op.name)) {
    return getFormulaForPipelineAgg(agg as PipelineAggs, reducedTimeRange);
  }

  if (METRIC_AGGS_WITHOUT_PARAMS.includes(op.name)) {
    const metricAgg = agg as MetricAggsWithoutParams;

    return getFormulaForAggsWithoutParams(
      metricAgg,
      metricAgg.aggParams && 'field' in metricAgg.aggParams
        ? metricAgg.aggParams?.field
        : undefined,
      reducedTimeRange
    );
  }

  if (op.name === Operations.PERCENTILE_RANK) {
    const percentileRanksAgg = agg as SchemaConfig<METRIC_TYPES.PERCENTILE_RANKS>;

    return getFormulaForPercentileRanks(
      percentileRanksAgg,
      percentileRanksAgg.aggParams?.field,
      reducedTimeRange
    );
  }

  return null;
};

export const getFormulaForPipelineAgg = (
  agg: SchemaConfig<
    | METRIC_TYPES.CUMULATIVE_SUM
    | METRIC_TYPES.DERIVATIVE
    | METRIC_TYPES.MOVING_FN
    | METRIC_TYPES.AVG_BUCKET
    | METRIC_TYPES.MAX_BUCKET
    | METRIC_TYPES.MIN_BUCKET
    | METRIC_TYPES.SUM_BUCKET
  >,
  reducedTimeRange?: string
) => {
  const { aggType } = agg;
  const supportedAgg = SUPPORTED_METRICS[aggType];
  if (!supportedAgg) {
    return null;
  }

  if (!agg.aggParams || !agg.aggParams.customMetric) {
    return null;
  }

  const metricAgg = convertToSchemaConfig(agg.aggParams.customMetric);
  const subFormula = getFormulaForSubMetric(metricAgg);
  if (subFormula === null) {
    return null;
  }

  if (PARENT_PIPELINE_AGGS.includes(supportedAgg.name)) {
    const formula = getFormulaFromMetric(supportedAgg);
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
